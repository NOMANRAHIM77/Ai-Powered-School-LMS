import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { resolveStudentScope, StudentRequest } from '../middleware/studentScope';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { studentPhotoUpload, encodeStudentPhoto } from '../middleware/studentPhoto';
import { AcademicYear } from '../models/AcademicYear';
import { StudentPreferences } from '../models/StudentPreferences';
import { Enrollment } from '../models/Enrollment';
import { Attendance } from '../models/Attendance';
import { FeeVoucher } from '../models/FeeVoucher';
import { Payment } from '../models/Payment';
import { Exam } from '../models/Exam';
import { Result } from '../models/Result';
import { Timetable } from '../models/Timetable';
import { Notice } from '../models/Notice';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';

const router = Router();
router.use(authenticate, resolveStudentScope);
const id = (req: StudentRequest) => req.allowedStudentIds![0];
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) });
const parse = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, result.error.issues.map(issue => issue.message).join('; '));
  return result.data;
};

router.get('/profile', asyncHandler(async (req: StudentRequest, res: Response) => {
  const year = await AcademicYear.findOne({ isCurrent: true });
  const [student, enrollment, preferences] = await Promise.all([
    Student.findById(id(req)).populate('userId', 'name email').select('-guardianIds'),
    Enrollment.findOne({ studentId: id(req), academicYearId: year?._id ?? null, status: 'active' }).populate({ path: 'sectionId', populate: { path: 'classId', select: 'name' } }).populate('academicYearId', 'name'),
    StudentPreferences.findOne({ studentId: id(req) }),
  ]);
  res.json(new ApiResponse(200, { student, enrollment, preferences }));
}));

router.patch('/profile', studentPhotoUpload, asyncHandler(async (req: StudentRequest, res: Response) => {
  const { name, ...input } = parse(z.object({ name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(30).optional(), address: z.string().trim().max(300).optional() }).strict(), req.body);
  const photo = await encodeStudentPhoto(req.file);
  const student = await Student.findOneAndUpdate({ _id: id(req), userId: req.user!._id }, { $set: { ...input, ...(photo ? { photo } : {}) } }, { new: true, runValidators: true }).select('phone address photo');
  if (!student) throw new ApiError(404, 'Student profile not found');
  if (name !== undefined) await User.updateOne({ _id: req.user!._id }, { $set: { name } }, { runValidators: true });
  res.json(new ApiResponse(200, student, 'Profile updated'));
}));

router.put('/preferences', asyncHandler(async (req: StudentRequest, res: Response) => {
  const input = parse(z.object({ language: z.enum(['en', 'ur']), theme: z.enum(['light', 'dark', 'system']), emailNotifications: z.boolean(), inAppNotifications: z.boolean(), reducedMotion: z.boolean() }).strict(), req.body);
  const preferences = await StudentPreferences.findOneAndUpdate({ studentId: id(req) }, { $set: input, $setOnInsert: { studentId: id(req) } }, { upsert: true, new: true, runValidators: true });
  res.json(new ApiResponse(200, preferences, 'Preferences saved'));
}));

router.get('/attendance', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pagination, req.query);
  const filter = { 'records.studentId': id(req) };
  const [records, total] = await Promise.all([Attendance.find(filter).select('date records').sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(), Attendance.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items: records.map(record => ({ date: record.date, status: record.records.find(r => r.studentId.toString() === id(req).toString())?.status })), page, limit, total }));
}));

router.get('/results', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pagination, req.query);
  const published = await Exam.find({ isPublished: true }).distinct('_id');
  const filter = { studentId: id(req), examId: { $in: published } };
  const [items, total] = await Promise.all([Result.find(filter).populate('examId', 'name startDate subjects').populate('marks.subjectId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Result.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items, page, limit, total }));
}));

router.get('/vouchers', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pagination, req.query);
  const filter = { studentId: id(req) };
  const [items, total] = await Promise.all([FeeVoucher.find(filter).sort({ year: -1, month: -1 }).skip((page - 1) * limit).limit(limit), FeeVoucher.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items, page, limit, total }));
}));

router.get('/vouchers/:voucherId', asyncHandler(async (req: StudentRequest, res: Response) => {
  if (!z.string().regex(/^[a-f\d]{24}$/i).safeParse(req.params.voucherId).success) throw new ApiError(400, 'Invalid voucher ID');
  const voucher = await FeeVoucher.findOne({ _id: req.params.voucherId, studentId: id(req) });
  if (!voucher) throw new ApiError(404, 'Voucher not found');
  res.json(new ApiResponse(200, voucher));
}));

router.get('/vouchers/:voucherId/payments', asyncHandler(async (req: StudentRequest, res: Response) => {
  if (!z.string().regex(/^[a-f\d]{24}$/i).safeParse(req.params.voucherId).success) throw new ApiError(400, 'Invalid voucher ID');
  const voucher = await FeeVoucher.findOne({ _id: req.params.voucherId, studentId: id(req) });
  if (!voucher) throw new ApiError(404, 'Voucher not found');
  const { page, limit } = parse(pagination, req.query);
  const [items, total] = await Promise.all([Payment.find({ voucherId: voucher._id }).select('amount method date').sort({ date: -1 }).skip((page - 1) * limit).limit(limit), Payment.countDocuments({ voucherId: voucher._id })]);
  res.json(new ApiResponse(200, { items, page, limit, total }));
}));

router.get('/timetable', asyncHandler(async (req: StudentRequest, res: Response) => {
  const enrollments = await Enrollment.find({ studentId: id(req), status: 'active' }).select('sectionId academicYearId');
  const items = enrollments.length ? await Timetable.find({ $or: enrollments.map(e => ({ sectionId: e.sectionId, academicYearId: e.academicYearId })) }).populate('periods.subjectId', 'name colorIndex').populate('periods.teacherId', 'userId').limit(42) : [];
  res.json(new ApiResponse(200, { items }));
}));

router.get('/notices', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pagination, req.query);
  const enrollments = await Enrollment.find({ studentId: id(req), status: 'active' }).populate('sectionId', 'classId');
  const classIds = enrollments.map(e => (e.sectionId as any)?.classId).filter(Boolean);
  const filter = { isActive: true, audience: { $in: ['all', 'student'] }, $and: [{ $or: [{ classIds: { $exists: false } }, { classIds: { $size: 0 } }, { classIds: { $in: classIds } }] }, { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }] }] };
  const [items, total] = await Promise.all([Notice.find(filter).select('title body audience isPinned createdAt expiresAt').sort({ isPinned: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit), Notice.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items, page, limit, total }));
}));

export default router;
