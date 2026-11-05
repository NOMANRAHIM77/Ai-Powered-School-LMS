import { TutorSource, TutorChunk } from '../models/TutorContent';
import { markingFields, reviewFields, publicCourseWork, gradeAssignedWork, expireQuizAttempts, validateQuestionMarks } from '../services/assignedQuizGrading';
import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { AcademicYear } from '../models/AcademicYear';
import { Course } from '../models/Course';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { CourseActivity, CourseWork, CourseMark } from '../models/CourseActivity';
import { CourseAttendance } from '../models/CourseAttendance';
const router = Router();
router.use(authenticate, authorize('teacher', 'student'));
const id = z.string().regex(/^[a-f\d]{24}$/i);
export function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> { const r = schema.safeParse(value); if (!r.success) throw new ApiError(400, r.error.issues.map(i => i.message).join('; ')); return r.data; }
const rawUpload = multer({ storage: multer.memoryStorage(), limits: { files: 3, fileSize: 3 * 1024 * 1024, fields: 10 } }).array('files', 3);
const upload: import('express').RequestHandler = (req, res, next) => rawUpload(req, res, error => next(error ? new ApiError(400, 'Upload up to 3 files, each at most 3 MB.') : undefined));
function files(req: AuthRequest) {
  return ((req.files ?? []) as Express.Multer.File[]).map(f => {
    const b = f.buffer;
    const type = b.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'image/jpeg' : b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP' ? 'image/webp' : f.mimetype === 'text/plain' && !b.includes(0) ? 'text/plain' : '';
    if (!type) throw new ApiError(400, 'Attach PDF, JPG, PNG, WebP, or plain text files (3 files, 3 MB each).');
    return { name: f.originalname.replace(/[\r\n/\\]/g, '_').slice(0,180), type, data: b };
  });
}
async function scope(req: AuthRequest) {
  const year = await AcademicYear.findOne({ isCurrent: true }); if (!year) throw new ApiError(400, 'No current academic year');
  if (req.user!.role === 'teacher') { const t = await Teacher.findOne({ userId: req.user!._id }); if (!t) throw new ApiError(404, 'Teacher not found'); return { student: null as any, filter: { academicYearId: year._id, teacherId: t._id } as any }; }
  const student = await Student.findOne({ userId: req.user!._id, status: 'active' }); if (!student) throw new ApiError(404, 'Student not found');
  const enrollment = await Enrollment.findOne({ studentId: student._id, academicYearId: year._id, status: 'active' });
  return { student, filter: { academicYearId: year._id, sectionId: enrollment?.sectionId ?? null } };
}
export async function courseScope(req: AuthRequest, courseId: string) { const context = await scope(req); const course = await Course.findOne({ ...context.filter, _id: parse(id, courseId) }); if (!course) throw new ApiError(404, 'Course not assigned to you'); return { ...context, course }; }
async function activityScope(req: AuthRequest) { const activity = await CourseActivity.findById(parse(id, req.params.activityId)).select(markingFields); if (!activity) throw new ApiError(404, 'Activity not found'); return { ...await courseScope(req, String(activity.courseId)), activity }; }
export function publicActivity(activity: any, teacher: boolean) { const a = typeof activity.toObject === 'function' ? activity.toObject() : activity; return { ...a, questions: a.questions?.map(({ correct, referenceAnswer, rubric, ...q }: any) => teacher ? { ...q, correct, referenceAnswer, rubric } : q), attachments: a.attachments?.map(({ data, ...f }: any) => f) }; }
async function roster(course: any) {
  const enrollments = await Enrollment.find({ academicYearId: course.academicYearId, sectionId: course.sectionId, status: 'active' });
  const students = await Student.find({ _id: { $in: enrollments.map(e => e.studentId) }, status: 'active' }).select('userId studentCode photo').populate('userId', 'name isActive removedAt').lean();
  return students.filter((s: any) => s.userId?.isActive && !s.userId.removedAt);
}
export const activityInput = z.object({ kind: z.enum(['material','assignment','quiz']), title: z.string().trim().min(1).max(160), body: z.string().max(30000).default(''), dueAt: z.string().datetime().optional(), opensAt: z.string().datetime().optional(), durationMinutes: z.number().int().min(1).max(300).optional(), maxMarks: z.number().min(1).max(10000).optional(), quizType: z.enum(['mcq','written']).optional(), questions: z.array(z.object({ prompt: z.string().trim().min(1).max(2000), options: z.array(z.string().trim().min(1).max(500)).max(6).default([]), correct: z.number().int().min(0).optional(), referenceAnswer: z.string().trim().max(5000).optional(), rubric: z.string().trim().max(2000).optional(), marks: z.number().min(1).max(100).default(1) }).strict()).max(50).default([]) }).strict().superRefine((v, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (v.kind !== 'material' && (!v.dueAt || Date.parse(v.dueAt) <= Date.now())) fail('Choose a future deadline');
  if (v.kind === 'assignment' && !v.maxMarks) fail('Maximum marks required');
  if (v.kind === 'quiz') { if (!v.opensAt || !v.dueAt || Date.parse(v.opensAt) >= Date.parse(v.dueAt) || !v.durationMinutes || !v.quizType || !v.questions.length) fail('Set quiz type, questions, opening/closing times and duration'); if (v.quizType === 'mcq' && v.questions.some(q => q.options.length < 2 || q.correct === undefined || q.correct >= q.options.length)) fail('Each MCQ needs options and a valid correct answer'); if (v.quizType === 'written' && v.questions.some(q => !q.referenceAnswer)) fail('Add a private reference answer for every written question'); }
});
router.get('/assignments', authorize('student'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const context = await scope(req); const courses = await Course.find(context.filter).select('_id');
  const items = await CourseActivity.find({ courseId: { $in: courses.map(c => c._id) }, kind: 'assignment' }).populate('courseId', 'subjectName').sort({ createdAt: -1 }).lean();
  const submissions = await CourseWork.find({ activityId: { $in: items.map(a => a._id) }, studentId: context.student._id }).lean(); res.json(new ApiResponse(200, { items, submissions }));
}));
router.get('/courses/:courseId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const context = await courseScope(req, req.params.courseId); const teacher = req.user!.role === 'teacher';
  const activities = await CourseActivity.find({ courseId: context.course._id }).select(teacher ? markingFields : '').sort({ createdAt: -1 });
  const submissions = await CourseWork.find({ activityId: { $in: activities.map(a => a._id) }, ...(teacher ? {} : { studentId: context.student._id }) }).select(teacher ? reviewFields : '+teacherResults').populate({ path: 'studentId', select: 'userId studentCode', populate: { path: 'userId', select: 'name' } }).lean();
  const marks = await CourseMark.find({ courseId: context.course._id, ...(teacher ? {} : { studentId: context.student._id }) }).lean();
  const sessions = teacher ? await CourseAttendance.find({ courseId: context.course._id }).select('date records').sort({ date: -1 }).lean() : [];
  // Quiz questions become visible only after the student starts an attempt.
  const items = activities.map(a => { const visible = publicActivity(a, teacher); if (!teacher && a.kind === 'quiz' && !submissions.some(s => String(s.activityId) === String(a._id))) visible.questions = []; return visible; });
  res.json(new ApiResponse(200, { items, submissions: submissions.map(w => publicCourseWork(w, activities.find(a => String(a._id) === String(w.activityId))?.kind ?? '', teacher)), marks, students: teacher ? await roster(context.course) : [], sessions, serverNow: new Date() }));
}));
router.post('/courses/:courseId/activities', authorize('teacher'), upload, asyncHandler(async (req: AuthRequest, res: Response) => {
  const context = await courseScope(req, req.params.courseId); let payload; try { payload = JSON.parse(req.body.payload); } catch { throw new ApiError(400, 'Invalid activity data'); }
  const input = parse(activityInput, payload); const item = await CourseActivity.create({ ...input, maxMarks: input.kind === 'quiz' ? input.questions.reduce((sum, q) => sum + q.marks, 0) : input.maxMarks, courseId: context.course._id, createdBy: req.user!._id, attachments: files(req) }); res.status(201).json(new ApiResponse(201, publicActivity(item, true)));
}));
router.delete('/activities/:activityId', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => { const { activity } = await activityScope(req); if (await CourseWork.exists({ activityId: activity._id })) throw new ApiError(409, 'Activities with submissions or quiz attempts cannot be deleted'); await activity.deleteOne(); await TutorChunk.deleteMany({ activityId: activity._id }); await TutorSource.deleteOne({ activityId: activity._id }); res.json(new ApiResponse(200, null)); }));
router.post('/activities/:activityId/start', authorize('student'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity, student } = await activityScope(req); const now = new Date();
  if (activity.kind !== 'quiz' || !activity.opensAt || !activity.dueAt || now < activity.opensAt || now >= activity.dueAt) throw new ApiError(409, 'Quiz is outside its available time slot');
  const deadline = new Date(Math.min(activity.dueAt.getTime(), now.getTime() + activity.durationMinutes! * 60000));
  const attempt = await CourseWork.findOneAndUpdate({ activityId: activity._id, studentId: student._id }, { $setOnInsert: { startedAt: now, deadline, answers: activity.questions.map(() => ''), draftVersion: 0 } }, { upsert: true, new: true });
  res.json(new ApiResponse(200, { attempt: publicCourseWork(attempt, 'quiz', false), activity: publicActivity(activity, false), serverNow: now }));
}));
router.post('/activities/:activityId/submit', authorize('student'), upload, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity, student } = await activityScope(req); const now = new Date();
  if (activity.kind === 'material') throw new ApiError(400, 'Material cannot be submitted');
  if (activity.kind === 'assignment') {
    if (!activity.dueAt || now > activity.dueAt) throw new ApiError(409, 'Assignment deadline has passed');
    const text = parse(z.string().trim().max(30000), req.body.text ?? ''); const attachments = files(req);
    if (!text && !attachments.length) throw new ApiError(400, 'Enter an answer or attach a file');
    try { const work = await CourseWork.create({ activityId: activity._id, studentId: student._id, text, attachments, submittedAt: now }); res.status(201).json(new ApiResponse(201, { _id: work._id })); } catch (e: any) { if (e.code === 11000) throw new ApiError(409, 'Already submitted'); throw e; } return;
  }
  const attempt = await CourseWork.findOne({ activityId: activity._id, studentId: student._id });
  if (!attempt || !attempt.deadline) throw new ApiError(409, 'Quiz not started');
  if (attempt.submittedAt) { res.json(new ApiResponse(200, publicCourseWork(attempt, 'quiz', false))); return; }
  let answers; try { answers = parse(z.array(z.string().max(5000)).max(50), JSON.parse(req.body.answers)); } catch { throw new ApiError(400, 'Invalid answers'); }
  // After expiry only answers already saved before the deadline can be graded.
  if (now >= attempt.deadline) answers = activity.questions.map((_, i) => attempt.answers[i] ?? '');
  if (answers.length !== activity.questions.length) throw new ApiError(400, 'Provide an answer entry for every question');
  if (activity.quizType === 'mcq' && answers.some((a, i) => a !== '' && (!/^\d+$/.test(a) || Number(a) >= activity.questions[i].options.length))) throw new ApiError(400, 'Invalid answer option');
  const work = await CourseWork.findOneAndUpdate({ _id: attempt._id, submittedAt: null }, { $set: { answers, submittedAt: now, quizReviewStatus: 'queued', autoSubmitted: now >= attempt.deadline } }, { new: true });
  if (!work) throw new ApiError(409, 'Attempt already submitted');
  void gradeAssignedWork(work._id).catch(() => console.warn('Quiz remains queued for checking.'));
  res.json(new ApiResponse(200, publicCourseWork(work, 'quiz', false)));
}));
router.put('/activities/:activityId/draft', authorize('student'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity, student } = await activityScope(req);
  if (activity.kind !== 'quiz') throw new ApiError(400, 'Only quiz attempts have drafts');
  const input = parse(z.object({ answers: z.array(z.string().max(5000)).length(activity.questions.length), version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict(), req.body);
  if (activity.quizType === 'mcq' && input.answers.some((a,i) => a !== '' && (!/^\d+$/.test(a) || Number(a) >= activity.questions[i].options.length))) throw new ApiError(400, 'Invalid option');
  const attempt = await CourseWork.findOneAndUpdate({ activityId: activity._id, studentId: student._id, submittedAt: null, deadline: { $gt: new Date() }, $or: [{ draftVersion: { $lt: input.version } }, { draftVersion: { $exists: false } }] }, { $set: { answers: input.answers, draftVersion: input.version } });
  if (!attempt) throw new ApiError(409, 'Attempt closed or not started');
  res.json(new ApiResponse(200, null));
}));
router.get('/activities/:activityId/reviews', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity } = await activityScope(req); if (activity.kind !== 'quiz') throw new ApiError(400, 'Select a quiz');
  await expireQuizAttempts(activity._id);
  await CourseWork.updateMany({ activityId: activity._id, submittedAt: { $ne: null }, quizReviewStatus: null }, { $set: { quizReviewStatus: 'queued' } });
  const works = await CourseWork.find({ activityId: activity._id }).select(reviewFields).populate({ path: 'studentId', select: 'userId studentCode', populate: { path: 'userId', select: 'name' } }).sort({ submittedAt: -1 }).lean();
  res.json(new ApiResponse(200, { activity: publicActivity(activity, true), works: works.map(w => publicCourseWork(w, 'quiz', true)) }));
}));
router.patch('/activities/:activityId/marking-scheme', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity } = await activityScope(req); if (activity.kind !== 'quiz' || activity.quizType !== 'written') throw new ApiError(400, 'Select a written quiz');
  const input = parse(z.object({ questions: z.array(z.object({ referenceAnswer: z.string().trim().min(1).max(5000), rubric: z.string().trim().max(2000).default('') }).strict()).length(activity.questions.length) }).strict(), req.body);
  if (await CourseWork.exists({ activityId: activity._id, quizReviewStatus: 'approved' })) throw new ApiError(409, 'The marking scheme is locked after marks are approved. You can still adjust individual marks.');
  input.questions.forEach((q, i) => { activity.questions[i].referenceAnswer = q.referenceAnswer; activity.questions[i].rubric = q.rubric; }); await activity.save();
  await CourseWork.updateMany({ activityId: activity._id, submittedAt: { $ne: null }, quizReviewStatus: { $ne: 'approved' } }, { $set: { quizReviewStatus: 'queued', gradeLease: null, aiError: '' }, $unset: { gradeToken: 1, aiResults: 1, aiTotal: 1 }, $inc: { reviewVersion: 1 } });
  res.json(new ApiResponse(200, null, 'Marking scheme saved; unapproved attempts queued for checking.'));
}));
router.post('/activities/:activityId/reviews/:workId/retry', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity } = await activityScope(req); if (activity.kind !== 'quiz') throw new ApiError(400, 'Select a quiz');
  const work = await CourseWork.findOneAndUpdate({ _id: parse(id, req.params.workId), activityId: activity._id, submittedAt: { $ne: null }, quizReviewStatus: 'error' }, { $set: { quizReviewStatus: 'queued', aiError: '', gradeLease: null } }, { new: true });
  if (!work) throw new ApiError(409, 'Only failed automatic checks can be retried. Refresh the review.');
  void gradeAssignedWork(work._id).catch(() => console.warn('Quiz retry remains queued.'));
  res.json(new ApiResponse(200, null));
}));
router.patch('/activities/:activityId/reviews/:workId', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity } = await activityScope(req); if (activity.kind !== 'quiz') throw new ApiError(400, 'Select a quiz');
  const input = parse(z.object({ action: z.enum(['draft', 'approve']), version: z.number().int().min(0), results: z.unknown(), feedback: z.string().max(3000).default('') }).strict(), req.body);
  const results = validateQuestionMarks(input.results, activity.questions); const total = Math.round(results.reduce((sum, r) => sum + r.marks, 0) * 100) / 100;
  const approved = input.action === 'approve'; const now = new Date();
  const work = await CourseWork.findOneAndUpdate({ _id: parse(id, req.params.workId), activityId: activity._id, submittedAt: { $ne: null }, $or: [{ reviewVersion: input.version }, ...(input.version === 0 ? [{ reviewVersion: { $exists: false } }] : [])] }, {
    $set: { draftResults: results, reviewFeedback: input.feedback, ...(approved ? { teacherResults: results, grade: total, feedback: input.feedback, gradedAt: now, approvedAt: now, approvedBy: req.user!._id, quizReviewStatus: 'approved', gradeLease: null } : {}) },
    $inc: { reviewVersion: 1 }, ...(approved ? { $push: { approvalHistory: { $each: [{ at: now, by: req.user!._id, total, results, feedback: input.feedback }], $slice: -20 } } } : {}),
  }, { new: true }).select(reviewFields);
  if (!work) throw new ApiError(409, 'This attempt is unavailable or changed since you opened it. Refresh before saving.');
  res.json(new ApiResponse(200, publicCourseWork(work, 'quiz', true), approved ? 'Marks approved and published.' : 'Review saved privately.'));
}));
router.patch('/activities/:activityId/grade/:workId', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity } = await activityScope(req); if (activity.kind === 'quiz') throw new ApiError(400, 'Approve per-question marks from the quiz review screen.'); const input = parse(z.object({ grade: z.number().min(0).max(activity.maxMarks ?? 0), feedback: z.string().max(3000).default('') }).strict(), req.body);
  const work = await CourseWork.findOneAndUpdate({ _id: parse(id, req.params.workId), activityId: activity._id, submittedAt: { $ne: null } }, { $set: { ...input, gradedAt: new Date() } }, { new: true }); if (!work) throw new ApiError(404, 'Submitted work not found'); res.json(new ApiResponse(200, work));
}));
router.put('/courses/:courseId/marks/:studentId', authorize('teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { course } = await courseScope(req, req.params.courseId); const studentId = parse(id, req.params.studentId);
  if (!(await roster(course)).some(s => String(s._id) === studentId)) throw new ApiError(404, 'Student not enrolled in this course');
  const input = parse(z.object({ marks: z.number().min(0), maxMarks: z.number().min(1).max(10000), feedback: z.string().max(3000).default('') }).strict().refine(v => v.marks <= v.maxMarks, 'Marks cannot exceed maximum'), req.body);
  res.json(new ApiResponse(200, await CourseMark.findOneAndUpdate({ courseId: course._id, studentId }, { $set: input }, { upsert: true, new: true })));
}));
router.get('/activities/:activityId/files/:fileId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { activity, student } = await activityScope(req); let owner: any = await CourseActivity.findById(activity._id).select('+attachments.data');
  if (req.query.workId) owner = await CourseWork.findOne({ _id: parse(id, req.query.workId), activityId: activity._id, ...(student ? { studentId: student._id } : {}) }).select('+attachments.data');
  const file = owner?.attachments.id(parse(id, req.params.fileId)); if (!file?.data) throw new ApiError(404, 'File not found');
  res.setHeader('Content-Type', file.type); res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.send(file.data);
}));
export default router;


