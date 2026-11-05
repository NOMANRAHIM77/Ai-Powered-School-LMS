import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { markAssignedAnswers, gradeAssignedWork, publicCourseWork, validateQuestionMarks, expireQuizAttempts } from '../src/services/assignedQuizGrading';
import * as tutor from '../src/services/courseTutor';
import { CourseActivity, CourseWork } from '../src/models/CourseActivity';
import { User } from '../src/models/User';
import { Teacher } from '../src/models/Teacher';
import { AcademicYear } from '../src/models/AcademicYear';
import { Course } from '../src/models/Course';
import routes, { publicActivity, activityInput } from '../src/routes/courseLearning.routes';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';

test('private reference answers and unapproved marks never appear in student payloads', () => {
  const activity = { kind: 'quiz', questions: [{ prompt: 'Why?', referenceAnswer: 'Private answer', rubric: 'Private criteria', correct: 1, marks: 2 }] };
  const visible = publicActivity(activity, false); assert.equal(visible.questions[0].referenceAnswer, undefined); assert.equal(visible.questions[0].rubric, undefined); assert.equal(visible.questions[0].correct, undefined);
  const work = { grade: 99, feedback: 'Unpublished', gradedAt: new Date(), quizReviewStatus: 'review', aiTotal: 2, aiResults: [{ marks: 2 }], draftResults: [{ marks: 1 }], teacherResults: [{ marks: 1 }], reviewFeedback: 'Private', gradeToken: 'lock' };
  const student = publicCourseWork(work, 'quiz', false);
  for (const key of ['grade', 'feedback', 'gradedAt', 'aiTotal', 'aiResults', 'draftResults', 'teacherResults', 'reviewFeedback', 'gradeToken']) assert.equal(student[key], undefined);
  const approved = publicCourseWork({ ...work, quizReviewStatus: 'approved' }, 'quiz', false); assert.equal(approved.grade, 99); assert.equal(approved.teacherResults[0].marks, 1); assert.equal(approved.draftResults, undefined); assert.equal(approved.aiResults, undefined);
  assert.equal(publicCourseWork({ grade: 5 }, 'quiz', false).grade, undefined, 'Legacy unapproved quiz marks are hidden');
  assert.equal(publicCourseWork({ grade: 5 }, 'assignment', false).grade, 5);
  const payload = { kind: 'quiz', title: 'Test', opensAt: new Date().toISOString(), dueAt: new Date(Date.now() + 60000).toISOString(), durationMinutes: 1, quizType: 'written', questions: [{ prompt: 'Why?', marks: 2 }] };
  assert.equal(activityInput.safeParse(payload).success, false); assert.ok(activityInput.safeParse({ ...payload, questions: activity.questions.map(({ correct, ...q }) => q) }).success);
});
test('MCQs use exact keys and written suggestions respect each maximum with deduction feedback', async () => {
  const mcq = { quizType: 'mcq', questions: [{ prompt: '2+2?', options: ['3', '4'], correct: 1, marks: 3 }, { prompt: '3+3?', options: ['6', '8'], correct: 0, marks: 2 }] };
  assert.deepEqual((await markAssignedAnswers(mcq, ['1', ''])).map(r => r.marks), [3, 0]);
  assert.equal((await markAssignedAnswers(mcq, ['0', '0']))[0].marks, 0);
  const old = tutor.groq; let bad = false;
  (tutor as any).groq = async (_: any, body: any) => { const input = JSON.parse(body.messages[1].content); assert.equal(input.questions.length, 1); assert.equal(input.questions[0].referenceAnswer, 'Light and water'); return { choices: [{ message: { content: JSON.stringify({ results: [{ index: 0, marks: bad ? 4 : 1, feedback: 'One mark deducted for missing water.' }] }) } }] }; };
  try {
    const written = { quizType: 'written', questions: [{ prompt: 'What is needed?', referenceAnswer: 'Light and water', rubric: 'One mark per item', marks: 2 }, { prompt: 'Other?', referenceAnswer: 'Answer', marks: 3 }] };
    const result = await markAssignedAnswers(written, ['Light', '']); assert.deepEqual(result.map(r => r.marks), [1, 0]); assert.match(result[0].feedback, /deducted/);
    bad = true; await assert.rejects(markAssignedAnswers(written, ['Light', '']), /invalid marks/);
    await assert.rejects(markAssignedAnswers({ quizType: 'written', questions: [{ prompt: 'Why?', marks: 2 }] }, ['Anything']), /reference answers/);
    assert.throws(() => validateQuestionMarks([{ index: 0, marks: 10, feedback: '' }], [{ marks: 2 }]));
    assert.throws(() => validateQuestionMarks([{ index: 0, marks: 1, feedback: '' }, { index: 0, marks: 1, feedback: '' }], [{ marks: 2 }, { marks: 2 }]));
  } finally { (tutor as any).groq = old; }
});
test('automatic checking stores proposals only and cannot overwrite a concurrent approval', async () => {
  const old = { lock: CourseWork.findOneAndUpdate, update: CourseWork.updateOne, activity: CourseActivity.findById }; let update: any; let query: any;
  (CourseWork as any).findOneAndUpdate = async (filter: any) => { assert.deepEqual(filter.quizReviewStatus.$in, ['queued', 'grading']); return { _id: 'work', activityId: 'quiz', answers: ['1'] }; };
  (CourseActivity as any).findById = () => ({ select: async () => ({ kind: 'quiz', quizType: 'mcq', questions: [{ prompt: '2+2?', correct: 1, options: ['3', '4'], marks: 2 }] }) });
  (CourseWork as any).updateOne = async (filter: any, value: any) => { query = filter; update = value; return { modifiedCount: 0 }; };
  try { await gradeAssignedWork('work'); assert.equal(update.$set.aiTotal, 2); assert.equal(update.$set.grade, undefined); assert.equal(update.$set.quizReviewStatus, 'review'); assert.equal(query.quizReviewStatus, 'grading'); assert.equal(typeof query.gradeToken, 'string'); }
  finally { CourseWork.findOneAndUpdate = old.lock; CourseWork.updateOne = old.update; CourseActivity.findById = old.activity; }
});
test('expiry submits saved drafts only and excludes assignments', async () => {
  const old = { find: CourseWork.find, quizzes: CourseActivity.distinct, update: CourseWork.updateMany };
  let update: any; let query: any;
  (CourseWork as any).find = () => ({ select: () => ({ limit: () => ({ lean: async () => [{ _id: 'work', activityId: 'quiz' }, { _id: 'assignment-work', activityId: 'assignment' }] }) }) });
  (CourseActivity as any).distinct = async (_: any, filter: any) => { assert.equal(filter.kind, 'quiz'); return ['quiz']; };
  (CourseWork as any).updateMany = async (filter: any, value: any) => { query = filter; update = value.$set; };
  try { await expireQuizAttempts(); assert.deepEqual(query.activityId.$in, ['quiz']); assert.equal(query.submittedAt, null); assert.ok(query.deadline.$lte); assert.equal(update.answers, undefined); assert.equal(update.autoSubmitted, true); assert.equal(update.quizReviewStatus, 'queued'); }
  finally { CourseWork.find = old.find; CourseActivity.distinct = old.quizzes; CourseWork.updateMany = old.update; }
});
test('teacher approval validates ownership, per-question limits and versions; saved drafts stay private', async () => {
  const old = { user: User.findById, teacher: Teacher.findOne, year: AcademicYear.findOne, course: Course.findOne, activity: CourseActivity.findById, update: CourseWork.findOneAndUpdate };
  const userId = new Types.ObjectId(), teacherId = new Types.ObjectId(), courseId = new Types.ObjectId(), activityId = new Types.ObjectId(), workId = new Types.ObjectId();
  let role = 'teacher', assigned = true; const activity = { _id: activityId, courseId, kind: 'quiz', quizType: 'written', maxMarks: 5, questions: [{ prompt: 'Q1', marks: 2 }, { prompt: 'Q2', marks: 3 }] };
  let work: any = { _id: workId, activityId, submittedAt: new Date(), quizReviewStatus: 'review', reviewVersion: 0, aiTotal: 2 };
  (User as any).findById = () => ({ select: async () => ({ _id: userId, role, isActive: true }) });
  (Teacher as any).findOne = async () => ({ _id: teacherId }); (AcademicYear as any).findOne = async () => ({ _id: 'year' });
  (Course as any).findOne = async (query: any) => { assert.equal(String(query.teacherId), String(teacherId)); return assigned ? { _id: courseId } : null; };
  (CourseActivity as any).findById = () => ({ select: async () => activity });
  (CourseWork as any).findOneAndUpdate = (query: any, update: any) => ({ select: async () => {
    assert.equal(String(query.activityId), String(activityId)); assert.equal(query.submittedAt.$ne, null);
    if (String(query._id) !== String(workId) || query.$or[0].reviewVersion !== work.reviewVersion) return null;
    work = { ...work, ...update.$set, reviewVersion: work.reviewVersion + 1 }; return work;
  } });
  const app = express(); app.use(express.json()); app.use('/learning', routes); app.use(errorHandler); const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(r => server.once('listening', r)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(userId), role: 'teacher', name: 'Test', email: 'test@example.test' });
    const request = (body: any, id = String(workId), suffix = 'reviews') => fetch(`http://127.0.0.1:${address.port}/learning/activities/${activityId}/${suffix}/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const draft = { action: 'draft', version: 0, results: [{ index: 0, marks: 1, feedback: 'Partial' }, { index: 1, marks: 2, feedback: 'One missing point' }], feedback: 'Reviewed' };
    role = 'student'; assert.equal((await request(draft)).status, 403); role = 'teacher'; assigned = false; assert.equal((await request(draft)).status, 404); assigned = true;
    assert.equal((await request(draft, String(new Types.ObjectId()))).status, 409);
    assert.equal((await request({ ...draft, results: [{ index: 0, marks: 3, feedback: '' }, draft.results[1]] })).status, 400);
    assert.equal((await request({ grade: 5 }, String(workId), 'grade')).status, 400);
    assert.equal((await request(draft)).status, 200); assert.equal(work.grade, undefined); assert.equal(work.quizReviewStatus, 'review');
    assert.equal((await request({ ...draft, action: 'approve' })).status, 409, 'Stale review cannot publish');
    assert.equal((await request({ ...draft, action: 'approve', version: 1 })).status, 200); assert.equal(work.grade, 3); assert.equal(work.quizReviewStatus, 'approved'); assert.equal(String(work.approvedBy), String(userId));
    assert.equal((await request({ ...draft, version: 2, results: [{ index: 0, marks: 2, feedback: '' }, { index: 1, marks: 3, feedback: '' }] })).status, 200);
    const student = publicCourseWork(work, 'quiz', false); assert.equal(student.grade, 3); assert.equal(student.teacherResults[0].marks, 1); assert.equal(student.draftResults, undefined);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); User.findById = old.user; Teacher.findOne = old.teacher; AcademicYear.findOne = old.year; Course.findOne = old.course; CourseActivity.findById = old.activity; CourseWork.findOneAndUpdate = old.update; }
});
