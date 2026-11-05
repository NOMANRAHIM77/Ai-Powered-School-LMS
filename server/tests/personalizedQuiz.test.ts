import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { generationInput, validateGenerated, generatePracticeQuestions, publicPractice, scoreMcqs, validateGrades, validateAnswers, gradePractice } from '../src/services/personalizedQuiz';
import { PersonalizedQuiz } from '../src/models/PersonalizedQuiz';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { AcademicYear } from '../src/models/AcademicYear';
import { Enrollment } from '../src/models/Enrollment';
import { Course } from '../src/models/Course';
import routes from '../src/routes/personalizedQuiz.routes';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';
import * as tutor from '../src/services/courseTutor';

const question = { prompt: 'What provides energy for photosynthesis?', options: ['Sunlight', 'Sound', 'Wind', 'Soil'], correct: 0, answer: 'Sunlight', explanation: 'Plants use sunlight to make food.', sourceId: 'source1', quote: 'Plants use sunlight to make food.' };
const source = { _id: 'source1', activityId: 'material1', text: question.quote, title: 'Plants', page: 2 };
test('generation rejects unsupported sources, duplicate questions, invalid options and excessive requests', () => {
  const valid = { materialIds: [String(new Types.ObjectId())], kind: 'mcq', difficulty: 'hard', count: 1, durationMinutes: 5 };
  assert.ok(generationInput.safeParse(valid).success);
  assert.equal(generationInput.safeParse({ ...valid, count: 16 }).success, false);
  assert.equal(generationInput.safeParse({ ...valid, durationMinutes: 0 }).success, false);
  assert.equal(generationInput.safeParse({ ...valid, materialIds: [valid.materialIds[0], valid.materialIds[0]] }).success, false);
  assert.equal(validateGenerated({ questions: [question] }, [source], 'mcq', 1)[0].source.page, 2);
  assert.throws(() => validateGenerated({ questions: [{ ...question, sourceId: 'other-course' }] }, [source], 'mcq', 1));
  assert.throws(() => validateGenerated({ questions: [{ ...question, quote: 'An invented supporting quotation.' }] }, [source], 'mcq', 1));
  assert.throws(() => validateGenerated({ questions: [question, question] }, [source], 'mcq', 2));
  assert.throws(() => validateGenerated({ questions: [{ ...question, options: ['A', 'A', 'B', 'C'] }] }, [source], 'mcq', 1));
});
test('answer keys remain private until completion and blank MCQs never earn marks', () => {
  const quiz = { kind: 'mcq', status: 'active', questionCount: 1, questions: [question], gradeToken: 'private', answers: [''] };
  const active = publicPractice(quiz);
  assert.deepEqual(active.questions, [{ prompt: question.prompt, options: question.options }]);
  assert.equal((active as any).gradeToken, undefined);
  assert.deepEqual(publicPractice({ ...quiz, status: 'ready' }).questions, []);
  assert.equal(publicPractice({ ...quiz, status: 'completed' }).questions[0].correct, 0);
  assert.equal(scoreMcqs([question], [''])[0].points, 0);
  assert.equal(scoreMcqs([question], ['0'])[0].points, 1);
  assert.throws(() => validateAnswers(quiz, ['4']));
  assert.throws(() => validateAnswers(quiz, []));
  assert.equal(validateGrades({ results: [{ index: 0, points: 1, feedback: 'Correct' }] }, quiz)[0].points, 0);
  assert.throws(() => validateGrades({ results: [{ index: 2, points: 1, feedback: 'Correct' }] }, quiz));
});

test('citations retain the original PDF passage despite whitespace and smart punctuation', () => {
  const text = 'The plant’s leaves\n use sunlight\u00a0to make food.';
  const result = validateGenerated({ questions: [{ ...question, quote: "The plant's leaves use sunlight to make food." }] }, [{ ...source, text }], 'mcq', 1);
  assert.equal(result[0].source.quote, text);
  assert.throws(() => validateGenerated({ questions: [{ ...question, quote: 'Leaves use moonlight to make food.' }] }, [{ ...source, text }], 'mcq', 1));
  assert.throws(() => validateGenerated({ questions: [{ ...question, quote: 'Energy is E = mc2.' }] }, [{ ...source, text: 'Energy is E = mc².' }], 'mcq', 1));
});

test('generation keeps valid questions and repairs invalid items using only selected excerpt IDs', async () => {
  const old = tutor.groq; const requests: any[] = [];
  const item = { ...question, sourceId: 'S1', quote: undefined };
  (tutor as any).groq = async (_: any, body: any) => {
    const payload = JSON.parse(body.messages[1].content); requests.push(payload);
    const questions = requests.length === 1 ? [item, { ...item, prompt: 'What energy do plants use?', sourceId: 'other-course' }]
      : [{ ...item, prompt: 'Which source of energy helps plants make food?' }];
    return { choices: [{ message: { content: JSON.stringify({ questions }) } }] };
  };
  try {
    const result = await generatePracticeQuestions([source], { kind: 'mcq', difficulty: 'medium', count: 2 });
    assert.equal(result.length, 2); assert.equal(requests.length, 2); assert.equal(requests[1].count, 1);
    assert.deepEqual(requests[0].excerpts, [{ sourceId: 'S1', text: source.text }]);
    assert.deepEqual(requests[1].previousPrompts, [question.prompt]);
    assert.match(requests[1].corrections[0], /sourceId/);
    assert.equal(result[0].source.activityId, source.activityId); assert.equal(result[0].source.quote, source.text);
  } finally { (tutor as any).groq = old; }
});

test('generation repairs truncated JSON and batches a maximum-length quiz without duplicate prompts', async () => {
  const old = tutor.groq; let calls = 0; let index = 0;
  (tutor as any).groq = async (_: any, body: any) => {
    const payload = JSON.parse(body.messages[1].content); calls++;
    assert.ok(payload.count <= 5);
    if (calls === 1) return { choices: [{ message: { content: '{"questions":[' } }] };
    return { choices: [{ message: { content: JSON.stringify({ questions: Array.from({ length: payload.count }, () => ({ ...question, sourceId: 'S1', quote: undefined, prompt: `Question ${++index}: What provides energy?` })) }) } }] };
  };
  try {
    const result = await generatePracticeQuestions([source], { kind: 'mcq', difficulty: 'hard', count: 15 });
    assert.equal(result.length, 15); assert.equal(calls, 4); assert.equal(new Set(result.map(q => q.prompt)).size, 15);
  } finally { (tutor as any).groq = old; }
});

test('written questions and flashcards use original passages, while invalid output never becomes a quiz', async () => {
  const old = tutor.groq; let calls = 0; let invalid = false;
  (tutor as any).groq = async () => { calls++; return { choices: [{ message: { content: JSON.stringify({ questions: [{ ...question, sourceId: 'S1', options: [], correct: null, quote: undefined, answer: invalid ? '' : 'Sunlight' }] }) } }] }; };
  try {
    for (const kind of ['written', 'flashcards'] as const) {
      const result = await generatePracticeQuestions([source], { kind, difficulty: 'easy', count: 1 });
      assert.equal(result[0].answer, 'Sunlight'); assert.equal(result[0].correct, undefined);
      assert.deepEqual(result[0].options, []); assert.equal(result[0].source.quote, source.text);
    }
    invalid = true; calls = 0;
    await assert.rejects(generatePracticeQuestions([source], { kind: 'written', difficulty: 'easy', count: 1 }), /Could only prepare 0 of 1/);
    assert.equal(calls, 3);
  } finally { (tutor as any).groq = old; }
});

test('generation rejects duplicate prompts across batches, stops on insufficient content, and preserves provider errors', async () => {
  const old = tutor.groq; let calls = 0;
  const input = { kind: 'mcq' as const, difficulty: 'medium' as const, count: 2 };
  (tutor as any).groq = async () => { calls++; return { choices: [{ message: { content: JSON.stringify({ questions: [{ ...question, sourceId: 'S1' }, { ...question, sourceId: 'S1' }] }) } }] }; };
  try {
    await assert.rejects(generatePracticeQuestions([source], input), /Could only prepare 1 of 2/); assert.equal(calls, 3);
    calls = 0;
    (tutor as any).groq = async () => { calls++; return { choices: [{ message: { content: '{"questions":[]}' } }] }; };
    await assert.rejects(generatePracticeQuestions([source], input), /Try fewer questions/); assert.equal(calls, 2);
    const limit = new Error('Rate limited'); calls = 0;
    (tutor as any).groq = async () => { calls++; throw limit; };
    await assert.rejects(generatePracticeQuestions([source], input), e => e === limit); assert.equal(calls, 1);
  } finally { (tutor as any).groq = old; }
});
test('short-answer grading failure retains frozen answers and retries without inventing a score', async () => {
  const old = { lock: PersonalizedQuiz.findOneAndUpdate, update: PersonalizedQuiz.updateOne, groq: tutor.groq };
  let update: any; let fail = true;
  (PersonalizedQuiz as any).findOneAndUpdate = () => ({ select: async () => ({ kind: 'written', questions: [question], questionCount: 1, answers: ['Sunlight'] }) });
  (PersonalizedQuiz as any).updateOne = async (_: any, value: any) => { update = value.$set; };
  (tutor as any).groq = async () => { if (fail) throw new Error('Rate limit'); return { choices: [{ message: { content: JSON.stringify({ results: [{ index: 0, points: 1, feedback: 'Correct.' }] }) } }] }; };
  try { await gradePractice('quiz'); assert.equal(update.score, undefined); assert.ok(update.gradeError); assert.ok(update.gradeLease > new Date()); fail = false; await gradePractice('quiz'); assert.equal(update.score, 1); assert.equal(update.status, 'completed'); }
  finally { PersonalizedQuiz.findOneAndUpdate = old.lock; PersonalizedQuiz.updateOne = old.update; (tutor as any).groq = old.groq; }
});
test('routes enforce course and student ownership, preserve deadline, freeze late answers and reject stale drafts', async () => {
  const old = { user: User.findById, student: Student.findOne, year: AcademicYear.findOne, enrollment: Enrollment.findOne, course: Course.findOne, quiz: PersonalizedQuiz.findOne, update: PersonalizedQuiz.updateOne, lock: PersonalizedQuiz.findOneAndUpdate };
  const userId = new Types.ObjectId(), studentId = new Types.ObjectId(), courseId = new Types.ObjectId(), quizId = new Types.ObjectId(), sectionId = new Types.ObjectId();
  let assigned = true, owns = true, role = 'student';
  let quiz: any = { _id: quizId, courseId, studentId, kind: 'mcq', difficulty: 'easy', questionCount: 1, durationMinutes: 5, questions: [question], answers: [''], draftVersion: 0, status: 'ready' };
  (User as any).findById = () => ({ select: async () => ({ _id: userId, role, isActive: true }) });
  (Student as any).findOne = async () => ({ _id: studentId });
  (AcademicYear as any).findOne = async () => ({ _id: 'year' });
  (Enrollment as any).findOne = async () => ({ sectionId });
  (Course as any).findOne = async (filter: any) => { assert.equal(String(filter.sectionId), String(sectionId)); return assigned ? { _id: courseId } : null; };
  (PersonalizedQuiz as any).findOne = (filter: any) => ({ select: async () => { assert.equal(String(filter.studentId), String(studentId)); assert.equal(String(filter.courseId), String(courseId)); return owns ? { ...quiz } : null; } });
  (PersonalizedQuiz as any).updateOne = async (filter: any, value: any) => {
    if (filter.status && quiz.status !== filter.status) return { modifiedCount: 0 };
    if (filter.deadline?.$gt && quiz.deadline <= filter.deadline.$gt) return { modifiedCount: 0 };
    if (filter.deadline?.$lte && (!quiz.deadline || quiz.deadline > filter.deadline.$lte)) return { modifiedCount: 0 };
    if (filter.draftVersion && quiz.draftVersion >= filter.draftVersion.$lt) return { modifiedCount: 0 };
    Object.assign(quiz, value.$set); return { modifiedCount: 1 };
  };
  (PersonalizedQuiz as any).findOneAndUpdate = (_: any, value: any) => ({ select: async () => { if (quiz.status !== 'grading' || (quiz.gradeLease && quiz.gradeLease > new Date())) return null; Object.assign(quiz, value.$set); return { ...quiz }; } });
  const app = express(); app.use(express.json()); app.use('/practice', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(r => server.once('listening', r)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(userId), role: 'student', name: 'Test', email: 'test@example.test' });
    const request = (method: string, suffix = '', body?: any) => fetch(`http://127.0.0.1:${address.port}/practice/${courseId}/${quizId}${suffix}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    assigned = false; assert.equal((await request('GET')).status, 404); assigned = true;
    owns = false; assert.equal((await request('POST', '/start')).status, 404); owns = true;
    role = 'teacher'; assert.equal((await request('GET')).status, 403); role = 'student';
    assert.equal((await request('POST', '/submit', { answers: ['0'] })).status, 409);
    const started: any = await (await request('POST', '/start')).json(); assert.equal(started.data.quiz.questions[0].correct, undefined);
    const deadline = quiz.deadline.getTime(); await request('POST', '/start'); assert.equal(quiz.deadline.getTime(), deadline);
    assert.equal((await request('PUT', '/draft', { answers: ['1'], version: 2 })).status, 200);
    assert.equal((await request('PUT', '/draft', { answers: ['0'], version: 1 })).status, 409);
    quiz.deadline = new Date(Date.now() - 1000);
    assert.equal((await request('PUT', '/draft', { answers: ['0'], version: 3 })).status, 409);
    const finished: any = await (await request('POST', '/submit', { answers: ['0'] })).json();
    assert.equal(finished.data.quiz.status, 'completed'); assert.equal(finished.data.quiz.score, 0); assert.deepEqual(quiz.answers, ['1']);
    await request('POST', '/submit', { answers: ['0'] }); assert.equal(quiz.score, 0);
    quiz = { ...quiz, status: 'active', answers: ['0'], gradeLease: null, deadline: new Date(Date.now() - 1000) };
    const reopened: any = await (await request('GET')).json(); assert.equal(reopened.data.quiz.status, 'completed'); assert.equal(reopened.data.quiz.score, 1);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); User.findById = old.user; Student.findOne = old.student; AcademicYear.findOne = old.year; Enrollment.findOne = old.enrollment; Course.findOne = old.course; PersonalizedQuiz.findOne = old.quiz; PersonalizedQuiz.updateOne = old.update; PersonalizedQuiz.findOneAndUpdate = old.lock; }
});
