import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { AcademicYear } from '../models/AcademicYear';
import { Class } from '../models/Class';
import { Section } from '../models/Section';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Enrollment } from '../models/Enrollment';
import { Course } from '../models/Course';
import { CourseAttendance } from '../models/CourseAttendance';
import { subjectsForSection, schoolDate, attendanceStats } from '../utils/courseCatalog';
import { wingForClass } from '../utils/schoolWings';
import { prepareCourses } from '../utils/prepareCourses';
import { parseSmartPlan, smartCourseFilter } from '../services/adminSearch';

const router = Router();
router.use(authenticate, authorize('admin', 'teacher', 'student', 'parent'));
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, result.error.issues.map(issue => issue.message).join('; '));
  return result.data;
};
async function currentYear() {
  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) throw new ApiError(400, 'Select a current academic year first');
  return year;
}
async function scope(req: AuthRequest) {
  const year = await currentYear();
  if (req.user!.role === 'admin') return { year, filter: { academicYearId: year._id } as any, student: null as any, enrollment: null as any };
  if (req.user!.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user!._id });
    if (!teacher) throw new ApiError(404, 'Teacher profile not found');
    return { year, filter: { academicYearId: year._id, teacherId: teacher._id }, student: null as any, enrollment: null as any };
  }
  const student = await Student.findOne(req.user!.role === 'parent' ? { _id: parse(objectId, req.query.studentId), guardianIds: req.user!._id, status: 'active' } : { userId: req.user!._id, status: 'active' });
  if (!student) throw new ApiError(404, 'Student profile not found');
  if (req.user!.role === 'parent' && !await User.exists({ _id: student.userId, isActive: true, removedAt: null })) throw new ApiError(404, 'Student is inactive');
  const enrollment = await Enrollment.findOne({ studentId: student._id, academicYearId: year._id, status: 'active' });
  return { year, student, enrollment, filter: { academicYearId: year._id, sectionId: enrollment?.sectionId ?? null } };
}
const populated = (query: any) => query.populate('classId', 'name').populate('sectionId', 'name').populate({ path: 'teacherId', select: 'userId', populate: { path: 'userId', select: 'name isActive removedAt' } });

router.post('/prepare', authorize('admin'), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const year = await currentYear();
  await prepareCourses(year._id);
  res.json(new ApiResponse(200, null));
}));

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const context = await scope(req);
  if (req.query.smart !== undefined) {
    if (req.user!.role !== 'admin') throw new ApiError(403, 'Administrator access is required for smart search');
    const plan = parseSmartPlan(req.query.smart, 'courses');
    if (plan) Object.assign(context.filter, await smartCourseFilter(plan, context.year._id));
  }
  const courses = await populated(Course.find(context.filter).sort({ subjectName: 1 })).lean();
  const records = context.student ? await CourseAttendance.find({ courseId: { $in: courses.map((course: any) => course._id) }, 'records.studentId': context.student._id }).lean() : [];
  const items = courses.map((course: any) => {
    const daily = records.filter(record => String(record.courseId) === String(course._id) && course.startDate && record.date >= course.startDate && (!context.enrollment || schoolDate(record.date) >= schoolDate(context.enrollment.enrolledAt))).map(record => ({ date: record.date, status: record.records.find(item => String(item.studentId) === String(context.student._id))!.status! }));
    return { ...course, wing: wingForClass(course.classId?.name ?? ''), ...(context.student ? { stats: attendanceStats(daily) } : {}) };
  });
  const teachers = req.user!.role === 'admin' ? await Teacher.find({ assignmentAcademicYearId: context.year._id }).select('userId wing sectionIds subjectNames').populate('userId', 'name isActive removedAt').lean() : [];
  res.json(new ApiResponse(200, { items, year: context.year.name, teachers: teachers.filter((teacher: any) => teacher.userId?.isActive && !teacher.userId.removedAt) }));
}));

router.patch('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parse(objectId, req.params.id);
  const input = parse(z.object({ startDate: z.string().date().optional(), teacherId: objectId.nullable().optional() }).strict(), req.body);
  const year = await currentYear();
  const course = await Course.findOne({ _id: id, academicYearId: year._id });
  if (!course) throw new ApiError(404, 'Course not found');
  if (input.startDate && input.startDate !== course.startDate?.toISOString().slice(0, 10)) {
    if (await CourseAttendance.exists({ courseId: id })) throw new ApiError(409, 'The start date cannot change after attendance has been recorded');
    if (input.startDate < year.startDate.toISOString().slice(0, 10) || input.startDate > year.endDate.toISOString().slice(0, 10)) throw new ApiError(400, 'Start date must be within the current academic year');
    course.startDate = new Date(input.startDate);
  }
  if (input.teacherId !== undefined) {
    if (input.teacherId) {
      const teacher = await Teacher.findOne({ _id: input.teacherId, assignmentAcademicYearId: year._id, sectionIds: course.sectionId });
      if (!teacher || !await User.exists({ _id: teacher.userId, role: 'teacher', isActive: true, removedAt: null })) throw new ApiError(400, 'Choose an active teacher assigned to this section and academic year');
      await Teacher.updateOne({ _id: teacher._id }, { $addToSet: { subjectNames: course.subjectName } });
    }
    course.teacherId = input.teacherId as any;
  }
  await course.save();
  res.json(new ApiResponse(200, course, 'Course updated'));
}));

async function authorizedCourse(req: AuthRequest) {
  const id = parse(objectId, req.params.id); const context = await scope(req);
  const course = await Course.findOne({ ...context.filter, _id: id });
  if (!course) throw new ApiError(404, 'Course not found or not assigned to you');
  return { ...context, course };
}
async function roster(course: any, date: string) {
  const enrollments = await Enrollment.find({ sectionId: course.sectionId, academicYearId: course.academicYearId, status: 'active' }).lean();
  const eligible = enrollments.filter(item => schoolDate(item.enrolledAt) <= date);
  const students = await Student.find({ _id: { $in: eligible.map(item => item.studentId) }, status: 'active' }).select('userId admissionNo photo').populate('userId', 'name isActive removedAt').lean();
  return students.filter((student: any) => student.userId?.isActive && !student.userId.removedAt);
}
router.get('/:id/attendance', asyncHandler(async (req: AuthRequest, res: Response) => {
  const context = await authorizedCourse(req);
  if (context.student) {
    const rows = await CourseAttendance.find({ courseId: context.course._id, 'records.studentId': context.student._id }).sort({ date: -1 }).lean();
    const items = rows.filter(row => context.course.startDate && row.date >= context.course.startDate && schoolDate(row.date) >= schoolDate(context.enrollment.enrolledAt)).map(row => ({ date: row.date, status: row.records.find(item => String(item.studentId) === String(context.student._id))!.status! }));
    res.json(new ApiResponse(200, { items, stats: attendanceStats(items) })); return;
  }
  const date = parse(z.string().date(), req.query.date ?? schoolDate());
  const [students, attendance] = await Promise.all([roster(context.course, date), CourseAttendance.findOne({ courseId: context.course._id, date: new Date(date) }).lean()]);
  res.json(new ApiResponse(200, { students, records: attendance?.records ?? [], marked: Boolean(attendance) }));
}));

router.put('/:id/attendance', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { course, year } = await authorizedCourse(req);
  const input = parse(z.object({ date: z.string().date(), records: z.array(z.object({ studentId: objectId, status: z.enum(['present', 'absent', 'late', 'leave']) }).strict()).min(1).max(1000) }).strict(), req.body);
  if (!course.startDate || input.date < course.startDate.toISOString().slice(0, 10)) throw new ApiError(400, 'Attendance begins on the course start date assigned by the admin');
  if (input.date > schoolDate() || input.date > year.endDate.toISOString().slice(0, 10)) throw new ApiError(400, 'Attendance cannot be marked in the future or outside the academic year');
  const students = await roster(course, input.date);
  const ids = new Set(input.records.map(item => item.studentId));
  if (ids.size !== input.records.length || ids.size !== students.length || students.some(student => !ids.has(String(student._id)))) throw new ApiError(400, 'Mark each eligible student once. Refresh the roster and try again.');
  const attendance = await CourseAttendance.findOneAndUpdate({ courseId: course._id, date: new Date(input.date) }, { $set: { records: input.records, markedBy: req.user!._id } }, { upsert: true, new: true, runValidators: true });
  res.json(new ApiResponse(200, attendance, 'Subject attendance saved'));
}));
export default router;
