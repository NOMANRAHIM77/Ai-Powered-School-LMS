import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { Enrollment } from '../src/models/Enrollment';
import { Course } from '../src/models/StudentLearning';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';
import routes from '../src/routes/studentLearning.routes';

test('course access uses authenticated school and enrolled sections, never caller-supplied identifiers', async () => {
  const originals = { user: User.findById, student: Student.findOne, enrollment: Enrollment.find, course: Course.findOne };
  const userId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const sectionId = new Types.ObjectId();
  const courseId = new Types.ObjectId();
  let courseFilter: any;
  (User as any).findById = () => ({ select: async () => ({ _id: userId, role: 'student', isActive: true, name: 'Ayesha', email: 'student@example.test' }) });
  (Student as any).findOne = () => ({ select: async () => ({ _id: studentId, schoolId }) });
  (Enrollment as any).find = (filter: any) => { assert.equal(String(filter.studentId), String(studentId)); return { distinct: async () => [sectionId] }; };
  (Course as any).findOne = async (filter: any) => { courseFilter = filter; return null; };
  const app = express(); app.use('/student', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(userId), role: 'student', name: 'Ayesha', email: 'student@example.test' });
    const response = await fetch(`http://127.0.0.1:${address.port}/student/courses/${courseId}?studentId=${new Types.ObjectId()}&schoolId=${new Types.ObjectId()}`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 404);
    assert.equal(String(courseFilter.schoolId), String(schoolId));
    assert.deepEqual(courseFilter.sectionId.$in.map(String), [String(sectionId)]);
    assert.equal(courseFilter.published, true);
    const anonymous = await fetch(`http://127.0.0.1:${address.port}/student/courses/${courseId}`);
    assert.equal(anonymous.status, 401);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    (User as any).findById = originals.user; (Student as any).findOne = originals.student;
    (Enrollment as any).find = originals.enrollment; (Course as any).findOne = originals.course;
  }
});
