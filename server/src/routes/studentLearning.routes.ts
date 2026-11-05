import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { resolveStudentScope, StudentRequest } from '../middleware/studentScope';
import { Enrollment } from '../models/Enrollment';
import { Course, Lesson, LessonProgress, Assignment, Submission, LeaveRequest } from '../models/StudentLearning';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';

const router = Router();
router.use(authenticate, resolveStudentScope);
const studentId = (req: StudentRequest) => req.allowedStudentIds![0];
// Null confines legacy students to legacy records until tenant IDs are migrated.
const schoolId = (req: StudentRequest) => req.schoolId ?? null;
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) });
function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, result.error.issues.map(issue => issue.message).join('; '));
  return result.data;
}
async function enrolledCourse(req: StudentRequest, courseId: string) {
  parse(objectId, courseId);
  const sections = await Enrollment.find({ studentId: studentId(req), status: 'active' }).distinct('sectionId');
  const course = await Course.findOne({ _id: courseId, schoolId: schoolId(req), sectionId: { $in: sections }, published: true });
  if (!course) throw new ApiError(404, 'Course not found');
  return course;
}

router.get('/leave', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pageSchema, req.query);
  const filter = { studentId: studentId(req), schoolId: schoolId(req) };
  const [items, total] = await Promise.all([LeaveRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), LeaveRequest.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items, total, page, limit }));
}));
router.post('/leave', asyncHandler(async (req: StudentRequest, res: Response) => {
  const input = parse(z.object({ startDate: z.string().date(), endDate: z.string().date(), reason: z.string().trim().min(3).max(1000) }).strict().refine(value => value.endDate >= value.startDate, 'End date must be on or after start date'), req.body);
  const item = await LeaveRequest.create({ ...input, studentId: studentId(req), schoolId: schoolId(req) });
  res.status(201).json(new ApiResponse(201, item, 'Leave request submitted'));
}));
router.get('/courses', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pageSchema, req.query);
  const sections = await Enrollment.find({ studentId: studentId(req), status: 'active' }).distinct('sectionId');
  const filter = { schoolId: schoolId(req), sectionId: { $in: sections }, published: true };
  const [items, total] = await Promise.all([Course.find(filter).populate('subjectId', 'name').sort({ title: 1 }).skip((page - 1) * limit).limit(limit), Course.countDocuments(filter)]);
  res.json(new ApiResponse(200, { items, total, page, limit }));
}));
router.get('/courses/:courseId', asyncHandler(async (req: StudentRequest, res: Response) => {
  const course = await enrolledCourse(req, req.params.courseId);
  const { page, limit } = parse(pageSchema, req.query);
  const filter = { courseId: course._id, schoolId: schoolId(req), published: true };
  const [lessons, total] = await Promise.all([Lesson.find(filter).select('title order').sort({ order: 1 }).skip((page - 1) * limit).limit(limit), Lesson.countDocuments(filter)]);
  const progress = await LessonProgress.find({ studentId: studentId(req), lessonId: { $in: lessons.map(lesson => lesson._id) } }).select('lessonId completed bookmarked');
  res.json(new ApiResponse(200, { course, lessons, progress, total, page, limit }));
}));
router.get('/lessons/:lessonId', asyncHandler(async (req: StudentRequest, res: Response) => {
  parse(objectId, req.params.lessonId);
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, schoolId: schoolId(req), published: true });
  if (!lesson) throw new ApiError(404, 'Lesson not found');
  await enrolledCourse(req, String(lesson.courseId));
  const progress = await LessonProgress.findOne({ studentId: studentId(req), lessonId: lesson._id });
  res.json(new ApiResponse(200, { lesson, progress }));
}));
router.put('/lessons/:lessonId/progress', asyncHandler(async (req: StudentRequest, res: Response) => {
  parse(objectId, req.params.lessonId);
  const input = parse(z.object({ completed: z.boolean(), bookmarked: z.boolean(), note: z.string().max(10000) }).strict(), req.body);
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, schoolId: schoolId(req), published: true });
  if (!lesson) throw new ApiError(404, 'Lesson not found');
  await enrolledCourse(req, String(lesson.courseId));
  const progress = await LessonProgress.findOneAndUpdate({ studentId: studentId(req), lessonId: lesson._id }, { $set: input, $setOnInsert: { studentId: studentId(req), lessonId: lesson._id, schoolId: lesson.schoolId } }, { upsert: true, new: true, runValidators: true });
  res.json(new ApiResponse(200, progress));
}));
router.get('/assignments', asyncHandler(async (req: StudentRequest, res: Response) => {
  const { page, limit } = parse(pageSchema, req.query);
  const sections = await Enrollment.find({ studentId: studentId(req), status: 'active' }).distinct('sectionId');
  const courses = await Course.find({ schoolId: schoolId(req), sectionId: { $in: sections }, published: true }).distinct('_id');
  const filter = { schoolId: schoolId(req), courseId: { $in: courses }, published: true };
  const [items, total] = await Promise.all([Assignment.find(filter).populate('courseId', 'title').sort({ dueAt: 1 }).skip((page - 1) * limit).limit(limit), Assignment.countDocuments(filter)]);
  const submissions = await Submission.find({ studentId: studentId(req), assignmentId: { $in: items.map(item => item._id) } }).select('assignmentId status grade submittedAt');
  res.json(new ApiResponse(200, { items, submissions, total, page, limit }));
}));
router.get('/assignments/:assignmentId', asyncHandler(async (req: StudentRequest, res: Response) => {
  parse(objectId, req.params.assignmentId);
  const assignment = await Assignment.findOne({ _id: req.params.assignmentId, schoolId: schoolId(req), published: true });
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  await enrolledCourse(req, String(assignment.courseId));
  const submission = await Submission.findOne({ assignmentId: assignment._id, studentId: studentId(req) });
  res.json(new ApiResponse(200, { assignment, submission }));
}));
router.put('/assignments/:assignmentId/submission', asyncHandler(async (req: StudentRequest, res: Response) => {
  parse(objectId, req.params.assignmentId);
  const input = parse(z.object({ text: z.string().trim().max(30000), submit: z.boolean() }).strict().refine(value => !value.submit || value.text.length > 0, 'Submission cannot be empty'), req.body);
  const assignment = await Assignment.findOne({ _id: req.params.assignmentId, schoolId: schoolId(req), published: true });
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  await enrolledCourse(req, String(assignment.courseId));
  const previous = await Submission.findOne({ assignmentId: assignment._id, studentId: studentId(req) });
  if (previous && previous.status !== 'draft' && !assignment.allowResubmit) throw new ApiError(409, 'Resubmission is not allowed');
  const late = Date.now() > assignment.dueAt.getTime();
  if (input.submit && late && !assignment.allowLate) throw new ApiError(409, 'The submission deadline has passed');
  const changes = { text: input.text, status: input.submit ? (late ? 'late' : 'submitted') : 'draft', submittedAt: input.submit ? new Date() : null };
  let submission;
  if (previous) {
    submission = await Submission.findOneAndUpdate({ _id: previous._id, updatedAt: previous.updatedAt }, { $set: changes, $unset: { grade: 1, feedback: 1 } }, { new: true, runValidators: true });
    if (!submission) throw new ApiError(409, 'The submission changed. Reload and try again');
  } else {
    try { submission = await Submission.create({ ...changes, assignmentId: assignment._id, studentId: studentId(req), schoolId: assignment.schoolId }); }
    catch (error: any) { if (error.code === 11000) throw new ApiError(409, 'The submission changed. Reload and try again'); throw error; }
  }
  res.json(new ApiResponse(200, submission));
}));
export default router;
