import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { courseScope, parse } from './courseLearning.routes';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { PersonalizedQuiz } from '../models/PersonalizedQuiz';
import { CourseActivity } from '../models/CourseActivity';
import { env } from '../config/env';
import { expirePractice, generatePractice, generationInput, gradePractice, publicPractice, validateAnswers } from '../services/personalizedQuiz';
const router = Router();
router.use(authenticate, authorize('student'));
const id = z.string().regex(/^[a-f\d]{24}$/i);
async function owned(req: AuthRequest) {
  const { student, course } = await courseScope(req, req.params.courseId);
  const quiz = await PersonalizedQuiz.findOne({ _id: parse(id, req.params.quizId), courseId: course._id, studentId: student._id }).select('+questions');
  if (!quiz) throw new ApiError(404, 'Practice quiz not found');
  return quiz;
}
const send = (res: Response, quiz: any) => res.json(new ApiResponse(200, { quiz: publicPractice(quiz), serverNow: new Date() }));
router.get('/:courseId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { student, course } = await courseScope(req, req.params.courseId);
  const filter = { courseId: course._id, studentId: student._id };
  const page = parse(z.coerce.number().int().min(1).max(100000).default(1), req.query.page);
  const [materials, history, totals, total] = await Promise.all([
    CourseActivity.find({ courseId: course._id, kind: 'material' }).select('title attachments.name createdAt').sort({ createdAt: -1 }).lean(),
    PersonalizedQuiz.find(filter).select('-answers -results -gradeToken -gradeLease').sort({ createdAt: -1 }).skip((page - 1) * 10).limit(10).lean(),
    PersonalizedQuiz.aggregate([{ $match: filter }, { $group: { _id: '$kind', generated: { $sum: 1 }, attempted: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$startedAt', null] }, null] }, 1, 0] } }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, average: { $avg: '$percentage' }, best: { $max: '$percentage' }, questions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$questionCount', 0] } } } }]),
    PersonalizedQuiz.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, { configured: !!env.GROQ_API_KEY, materials, history, totals, total, page, pages: Math.max(1, Math.ceil(total / 10)) }));
}));
router.post('/:courseId/generate', rateLimit({ windowMs: 60000, limit: 3, keyGenerator: (req: any) => String(req.user._id) }), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { student, course } = await courseScope(req, req.params.courseId);
  const input = parse(generationInput, req.body);
  const quiz = await generatePractice(String(course._id), String(student._id), input);
  await courseScope(req, req.params.courseId);
  send(res, quiz);
}));
router.get('/:courseId/:quizId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await owned(req); await expirePractice(quiz._id); send(res, await owned(req));
}));
router.post('/:courseId/:quizId/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await owned(req);
  if (quiz.kind === 'flashcards') throw new ApiError(400, 'Flashcards do not use a timer');
  await PersonalizedQuiz.updateOne({ _id: quiz._id, status: 'ready' }, { $set: { status: 'active', startedAt: new Date(), deadline: new Date(Date.now() + quiz.durationMinutes! * 60000) } });
  await expirePractice(quiz._id); send(res, await owned(req));
}));
router.put('/:courseId/:quizId/draft', asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await owned(req);
  const version = parse(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), req.body.version);
  const answers = validateAnswers(quiz, req.body.answers);
  const update = await PersonalizedQuiz.updateOne({ _id: quiz._id, status: 'active', deadline: { $gt: new Date() }, draftVersion: { $lt: version } }, { $set: { answers, draftVersion: version } });
  if (!update.modifiedCount) throw new ApiError(409, 'Quiz has ended or a newer answer draft is already saved. Reopen it to refresh.');
  res.json(new ApiResponse(200, { version }));
}));
router.post('/:courseId/:quizId/submit', asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await owned(req); const now = new Date();
  if (quiz.kind === 'flashcards' || quiz.status === 'ready') throw new ApiError(409, 'Start the quiz before submitting');
  if (quiz.status === 'active' && quiz.deadline && now < quiz.deadline) {
    const answers = validateAnswers(quiz, req.body.answers);
    await PersonalizedQuiz.updateOne({ _id: quiz._id, status: 'active', deadline: { $gt: now } }, { $set: { answers, status: 'grading', submittedAt: now } });
  }
  // Expired submissions always use the server's last saved draft.
  await expirePractice(quiz._id); await gradePractice(quiz._id); send(res, await owned(req));
}));
router.put('/:courseId/:quizId/cards', asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await owned(req); if (quiz.kind !== 'flashcards') throw new ApiError(400, 'Not a flashcard deck');
  const mastered = parse(z.array(z.number().int().min(0).max(quiz.questionCount - 1)).max(quiz.questionCount), req.body.mastered);
  const unique = [...new Set(mastered)];
  await PersonalizedQuiz.updateOne({ _id: quiz._id }, { $set: { mastered: unique, startedAt: quiz.startedAt ?? new Date(), status: unique.length === quiz.questionCount ? 'completed' : 'active', completedAt: unique.length === quiz.questionCount ? new Date() : null } });
  send(res, await owned(req));
}));
export default router;
