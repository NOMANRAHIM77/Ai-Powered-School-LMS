import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { studentPhotoUpload, encodeStudentPhoto } from '../middleware/studentPhoto';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
const router = Router();
router.use(authenticate, authorize('teacher'));
router.get('/profile', asyncHandler(async (req: AuthRequest, res: Response) => {
  const teacher = await Teacher.findOne({ userId: req.user!._id }).populate('userId', 'name email').populate('assignmentAcademicYearId', 'name').populate({ path: 'sectionIds', select: 'name classId', populate: { path: 'classId', select: 'name' } });
  if (!teacher) throw new ApiError(404, 'Teacher profile not found');
  res.json(new ApiResponse(200, teacher));
}));
router.patch('/profile', studentPhotoUpload, asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(30).optional(), address: z.string().trim().max(300).optional(), qualification: z.string().trim().max(300).optional() }).strict().safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Enter a valid name, phone, address and qualification');
  const { name, ...input } = parsed.data;
  const photo = await encodeStudentPhoto(req.file);
  const teacher = await Teacher.findOneAndUpdate({ userId: req.user!._id }, { $set: { ...input, ...(photo ? { photo } : {}) } }, { new: true, runValidators: true }).select('phone address qualification photo');
  if (!teacher) throw new ApiError(404, 'Teacher profile not found');
  if (name !== undefined) await User.updateOne({ _id: req.user!._id }, { $set: { name } }, { runValidators: true });
  res.json(new ApiResponse(200, teacher, 'Profile updated'));
}));
export default router;
