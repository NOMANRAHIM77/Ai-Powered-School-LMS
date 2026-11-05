import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { AcademicYear } from '../models/AcademicYear';
import { ApiResponse, asyncHandler } from '../utils/apiHelpers';
const router = Router();
router.use(authenticate, authorize('parent'));
router.get('/children', asyncHandler(async (req: any, res: Response) => {
  const year = await AcademicYear.findOne({ isCurrent: true });
  const students = await Student.find({ guardianIds: req.user._id, status: 'active' }).select('userId studentCode admissionNo photo gender parentName parentPhone').populate('userId', 'name isActive removedAt').lean();
  const active = students.filter((s: any) => s.userId?.isActive && !s.userId.removedAt);
  const enrollments = year ? await Enrollment.find({ studentId: { $in: active.map(s => s._id) }, academicYearId: year._id, status: 'active' }).populate({ path: 'sectionId', populate: { path: 'classId', select: 'name' } }).lean() : [];
  res.json(new ApiResponse(200, { year: year?.name, items: active.map(s => ({ ...s, enrollment: enrollments.find(e => String(e.studentId) === String(s._id)) ?? null })) }));
}));
export default router;

