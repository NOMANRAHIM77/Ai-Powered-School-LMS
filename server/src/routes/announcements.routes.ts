import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Announcement } from '../models/Announcement';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
const fields = z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(10000), audience: z.enum(['student', 'teacher', 'parent', 'all']), removeAttachment: z.enum(['true', 'false']).optional() }).strict();
const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);
const visible = (req: AuthRequest) => ({ expiresAt: { $gt: new Date() }, ...(req.user!.role === 'admin' ? {} : { audience: { $in: req.user!.role === 'parent' ? ['all', 'parent', 'student'] : ['all', req.user!.role] } }) });

function attachment(file?: Express.Multer.File) {
  if (!file) return undefined;
  const data = file.buffer;
  const isPdf = data.subarray(0, 5).toString() === '%PDF-';
  const isPng = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
  const isWebp = data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  const isText = file.mimetype === 'text/plain' && !data.includes(0);
  const contentType = isPdf ? 'application/pdf' : isPng ? 'image/png' : isJpeg ? 'image/jpeg' : isWebp ? 'image/webp' : isText ? 'text/plain' : '';
  if (!contentType) throw new ApiError(400, 'Upload a PDF, PNG, JPEG, WebP, or text file.');
  return { name: file.originalname.replace(/[\r\n/\\]/g, '_').slice(0, 180), contentType, data };
}

router.use(authenticate);
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = await Announcement.find(visible(req)).select('-attachment.data').sort({ createdAt: -1 }).lean();
  const unread = await Announcement.countDocuments({ ...visible(req), readBy: { $ne: req.user!._id } });
  res.json(new ApiResponse(200, { items: items.map(({ readBy, ...item }) => ({ ...item, isRead: readBy.some(id => String(id) === req.user!._id) })), unread }));
}));
router.get('/:id/attachment', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid announcement');
  const item = await Announcement.findOne({ _id: req.params.id, ...visible(req) }).select('+attachment.data');
  if (!item?.attachment?.data) throw new ApiError(404, 'Attachment not found');
  res.setHeader('Content-Type', item.attachment.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(item.attachment.name || 'attachment')}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(item.attachment.data);
}));
router.post('/:id/read', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid announcement');
  const item = await Announcement.findOneAndUpdate({ _id: req.params.id, ...visible(req) }, { $addToSet: { readBy: req.user!._id } });
  if (!item) throw new ApiError(404, 'Announcement not found');
  res.json(new ApiResponse(200, null, 'Marked as read'));
}));
router.post('/', authorize('admin'), upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = fields.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Enter a title, message, and valid audience.');
  const file = attachment(req.file);
  const item = await Announcement.create({ title: parsed.data.title, body: parsed.data.body, audience: parsed.data.audience, authorId: req.user!._id, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), ...(file ? { attachment: file } : {}) });
  res.status(201).json(new ApiResponse(201, { _id: item._id }, 'Announcement published'));
}));
router.patch('/:id', authorize('admin'), upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid announcement');
  const parsed = fields.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Enter a title, message, and valid audience.');
  const file = attachment(req.file);
  const updates: Record<string, unknown> = { title: parsed.data.title, body: parsed.data.body, audience: parsed.data.audience, readBy: [] };
  if (file) updates.attachment = file;
  const item = await Announcement.findOneAndUpdate({ _id: req.params.id, expiresAt: { $gt: new Date() } }, { $set: updates, ...(!file && parsed.data.removeAttachment === 'true' ? { $unset: { attachment: 1 } } : {}) }, { new: true });
  if (!item) throw new ApiError(404, 'Announcement not found or expired');
  res.json(new ApiResponse(200, { _id: item._id }, 'Announcement updated'));
}));
router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid announcement');
  const item = await Announcement.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Announcement not found');
  res.json(new ApiResponse(200, null, 'Announcement deleted'));
}));
export default router;
