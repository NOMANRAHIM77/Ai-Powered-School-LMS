import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { Assignment, Course, LessonProgress, LeaveRequest, Submission } from '../src/models/StudentLearning';

test('learning and assignment records require ownership fields', () => {
  assert.ok(new Course({ title: 'Science' }).validateSync()?.errors.sectionId);
  assert.ok(new Assignment({ title: 'Homework' }).validateSync()?.errors.courseId);
  assert.ok(new Submission({ text: 'work' }).validateSync()?.errors.studentId);
  assert.ok(new LeaveRequest({ reason: 'Illness' }).validateSync()?.errors.studentId);
});

test('progress and submissions enforce a unique student-owned record', () => {
  const indexes = (model: typeof LessonProgress) => model.schema.indexes();
  assert.ok(indexes(LessonProgress).some(([keys, options]) => keys.studentId === 1 && keys.lessonId === 1 && options.unique));
  assert.ok(Submission.schema.indexes().some(([keys, options]) => keys.studentId === 1 && keys.assignmentId === 1 && options.unique));
});

test('student notes are limited and cannot store an invalid status', () => {
  const studentId = new Types.ObjectId();
  const lessonId = new Types.ObjectId();
  assert.ok(new LessonProgress({ studentId, lessonId, note: 'x'.repeat(10001) }).validateSync()?.errors.note);
  assert.ok(new Submission({ studentId, assignmentId: new Types.ObjectId(), status: 'approved' }).validateSync()?.errors.status);
});
