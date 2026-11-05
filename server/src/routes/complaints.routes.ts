import { Router, RequestHandler, Response } from 'express';
import multer from 'multer';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Student } from '../models/Student';
import { Complaint } from '../models/Complaint';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { schoolDate } from '../utils/courseCatalog';

const router = Router();
router.use(authenticate, authorize('admin', 'student'));
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 3, fileSize: 3 * 1024 * 1024, fields: 6 } }).array('files', 3);
const receive: RequestHandler = (req, res, next) => upload(req, res, error => next(error instanceof multer.MulterError ? new ApiError(400, 'Attach up to 3 files, each 3 MB or smaller.') : error));
const parse = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> => { const result = schema.safeParse(value); if (!result.success) throw new ApiError(400, result.error.issues.map(issue => issue.message).join('; ')); return result.data; };
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
export const complaintScope = (req: AuthRequest) => req.user!.role === 'admin' ? {} : { userId: req.user!._id };
export function complaintFile(file: Express.Multer.File) {
  const b = file.buffer;
  const type = b.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf'
    : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'image/jpeg'
    : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'image/webp'
    : file.mimetype === 'text/plain' && !b.includes(0) ? 'text/plain' : '';
  if (!type) throw new ApiError(400, 'Attachments must be PDF, JPG, PNG, WebP or text files.');
  return { name: file.originalname.replace(/[\r\n/\\]/g, '_').slice(0, 180), contentType: type, data: b };
}
export async function createComplaintWithReference(input: Record<string, unknown>) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const used = new Set<string>(await Complaint.distinct('reference'));
    const available = Array.from({ length: 9000 }, (_, i) => String(i + 1000)).filter(code => !used.has(code));
    if (!available.length) throw new ApiError(409, 'All four-digit complaint references have been used. Contact the school administrator.');
    try { return await Complaint.create({ ...input, reference: available[randomInt(available.length)] }); }
    catch (error: any) { if (error.code !== 11000 || !error.keyPattern?.reference) throw error; }
  }
  throw new ApiError(409, 'Unable to allocate a complaint reference. Please try again.');
}
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = parse(z.object({ page: z.coerce.number().int().min(1).default(1), status: z.enum(['resolved', 'unresolved', '']).default(''), search: z.string().trim().max(160).default('') }), req.query);
  const filter: any = { ...complaintScope(req), ...(query.status ? { status: query.status } : {}) };
  if (query.search) { const pattern = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = [{ reference: pattern }, { title: pattern }]; }
  const [items, total] = await Promise.all([Complaint.find(filter).select('-attachments.data').populate('userId', 'name email').populate('studentId', 'admissionNo').sort({ createdAt: -1 }).skip((query.page - 1) * 20).limit(20).lean(), Complaint.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items, total, page: query.page, limit: 20 }));
}));
router.post('/', authorize('student'), receive, asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = parse(z.object({ title: z.string().trim().min(1).max(160), category: z.enum(['Academic', 'Teacher / staff', 'Facilities', 'Fees', 'Bullying / safety', 'Other']), description: z.string().trim().min(1).max(10000), incidentDate: z.string().date().optional(), location: z.string().trim().max(200).optional() }).strict(), req.body);
  if (input.incidentDate && input.incidentDate > schoolDate()) throw new ApiError(400, 'Incident date cannot be in the future');
  const student = await Student.findOne({ userId: req.user!._id });
  if (!student) throw new ApiError(404, 'Student profile not found');
  const item = await createComplaintWithReference({ ...input, studentId: student._id, userId: req.user!._id, attachments: ((req.files ?? []) as Express.Multer.File[]).map(complaintFile) });
  res.status(201).json(new ApiResponse(201, { _id: item._id, reference: item.reference }, 'Complaint registered'));
}));
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parse(idSchema, req.params.id);
  const item = await Complaint.findOne({ _id: id, ...complaintScope(req) }).select('-attachments.data').populate('userId', 'name email').populate('studentId', 'admissionNo').populate('updates.authorId', 'name');
  if (!item) throw new ApiError(404, 'Complaint not found');
  res.json(new ApiResponse(200, item));
}));
router.get('/:id/files/:fileId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parse(idSchema, req.params.id); const fileId = parse(idSchema, req.params.fileId);
  const item = await Complaint.findOne({ _id: id, ...complaintScope(req) }).select('+attachments.data');
  const file = item?.attachments.id(fileId);
  if (!file?.data) throw new ApiError(404, 'Attachment not found');
  res.set({ 'Content-Type': file.contentType ?? 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name ?? 'attachment')}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(file.data);
}));
router.patch('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parse(idSchema, req.params.id);
  const input = parse(z.object({ remark: z.string().trim().min(1).max(2000), status: z.enum(['resolved', 'unresolved']) }).strict(), req.body);
  const item = await Complaint.findOneAndUpdate({ _id: id }, { $set: { status: input.status, resolvedAt: input.status === 'resolved' ? new Date() : null }, $push: { updates: { ...input, authorId: req.user!._id, date: new Date() } } }, { new: true, runValidators: true }).select('_id reference status');
  if (!item) throw new ApiError(404, 'Complaint not found');
  res.json(new ApiResponse(200, item, 'Complaint updated'));
}));
export default router;
