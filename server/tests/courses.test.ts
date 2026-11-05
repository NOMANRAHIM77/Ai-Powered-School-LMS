import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Teacher } from '../src/models/Teacher';
import { Student } from '../src/models/Student';
import { AcademicYear } from '../src/models/AcademicYear';
import { Enrollment } from '../src/models/Enrollment';
import { Course } from '../src/models/Course';
import { CourseAttendance } from '../src/models/CourseAttendance';
import { subjectsForSection, attendanceStats, schoolDate } from '../src/utils/courseCatalog';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';
import routes from '../src/routes/courses.routes';

test('subject catalog follows wings and streams, and unmarked days are not counted', () => {
  assert.deepEqual(subjectsForSection('primary', 'A'), ['Science', 'Urdu', 'English', 'Math', 'General Knowledge', 'Islamiyat']);
  assert.deepEqual(subjectsForSection('secondary', 'Pre-Engineering - B'), ['Math', 'Chemistry', 'Physics', 'Urdu', 'Islamiyat', 'Pakistan Studies', 'English']);
  assert.ok(subjectsForSection('higher', 'Medical - C').includes('Biology'));
  assert.ok(!subjectsForSection('higher', 'Medical - C').includes('Math'));
  assert.deepEqual(subjectsForSection('higher', 'Humanities - D'), ['Economics', 'Physics', 'Urdu', 'Islamiyat', 'Pakistan Studies', 'English']);
  assert.ok(subjectsForSection('secondary', 'Computer Science - A').includes('Computer Science'));
  assert.equal(attendanceStats([]).percentage, null);
  assert.deepEqual(attendanceStats([{ status: 'present' }, { status: 'late' }, { status: 'absent' }, { status: 'leave' }]), { present: 1, late: 1, absent: 1, leave: 1, total: 4, percentage: 50 });
});

test('course attendance enforces assignment, dates, roster completeness and student privacy', async () => {
  const old = { user: User.findById, teacher: Teacher.findOne, student: Student.findOne, students: Student.find, year: AcademicYear.findOne, enrollment: Enrollment.findOne, enrollments: Enrollment.find, course: Course.findOne, attendance: CourseAttendance.find, write: CourseAttendance.findOneAndUpdate, exists: CourseAttendance.exists };
  const userId = new Types.ObjectId(); const teacherId = new Types.ObjectId(); const studentId = new Types.ObjectId(); const otherStudentId = new Types.ObjectId();
  const yearId = new Types.ObjectId(); const sectionId = new Types.ObjectId(); const courseId = new Types.ObjectId();
  const date = schoolDate(); const start = '2020-01-01';
  let role: 'teacher' | 'student' | 'admin' | 'parent' = 'teacher'; let assigned = true; let hasAttendance = false; let writes = 0;
  const oldUserExists = User.exists;
  (User as any).exists = async () => ({ _id: userId });
  const course: any = { _id: courseId, academicYearId: yearId, sectionId, teacherId, startDate: new Date(start), save: async () => undefined };
  (User as any).findById = () => ({ select: async () => ({ _id: userId, name: 'Test', email: 'test@example.test', role, isActive: true }) });
  (Teacher as any).findOne = async () => ({ _id: teacherId });
  (Student as any).findOne = async (filter: any) => { if (role === 'parent') { assert.equal(filter.guardianIds, String(userId)); if (filter._id !== String(studentId)) return null; } return { _id: studentId, userId }; };
  (AcademicYear as any).findOne = async () => ({ _id: yearId, name: 'Current', startDate: new Date(start), endDate: new Date('2099-12-31') });
  (Enrollment as any).findOne = async () => ({ studentId, sectionId, enrolledAt: new Date(start) });
  (Enrollment as any).find = () => ({ lean: async () => [{ studentId, enrolledAt: new Date(start) }] });
  (Student as any).find = () => ({ select: () => ({ populate: () => ({ lean: async () => [{ _id: studentId, userId: { name: 'Student', isActive: true } }] }) }) });
  (Course as any).findOne = async (filter: any) => {
    assert.equal(String(filter.academicYearId), String(yearId));
    if (role === 'teacher') { assert.equal(String(filter.teacherId), String(teacherId)); if (!assigned) return null; }
    if (role === 'student') assert.equal(String(filter.sectionId), String(sectionId));
    return course;
  };
  (CourseAttendance as any).findOneAndUpdate = async (filter: any, update: any, options: any) => {
    writes++; assert.equal(String(filter.courseId), String(courseId)); assert.equal(filter.date.toISOString().slice(0, 10), date);
    assert.equal(update.$set.markedBy, String(userId)); assert.equal(options.upsert, true); return update.$set;
  };
  (CourseAttendance as any).exists = async () => hasAttendance ? { _id: new Types.ObjectId() } : null;
  (CourseAttendance as any).find = (filter: any) => {
    assert.equal(String(filter['records.studentId']), String(studentId));
    return { sort: () => ({ lean: async () => [{ date: new Date(date), records: [{ studentId, status: 'present' }, { studentId: otherStudentId, status: 'absent' }] }] }) };
  };
  const app = express(); app.use(express.json()); app.use('/courses', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(userId), name: 'Test', email: 'test@example.test', role: 'teacher' });
    const request = (method: string, path: string, body?: any) => fetch(`http://127.0.0.1:${address.port}/courses/${courseId}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const payload = { date, records: [{ studentId: String(studentId), status: 'present' }] };
    assigned = false; assert.equal((await request('PUT', '/attendance', payload)).status, 404); assigned = true;
    course.startDate = null; assert.equal((await request('PUT', '/attendance', payload)).status, 400); course.startDate = new Date(start);
    assert.equal((await request('PUT', '/attendance', { ...payload, date: '2019-12-31' })).status, 400);
    assert.equal((await request('PUT', '/attendance', { ...payload, date: '2099-01-01' })).status, 400);
    assert.equal((await request('PUT', '/attendance', { ...payload, records: [payload.records[0], payload.records[0]] })).status, 400);
    assert.equal((await request('PUT', '/attendance', { ...payload, records: [{ studentId: String(otherStudentId), status: 'present' }] })).status, 400);
    assert.equal((await request('PUT', '/attendance', payload)).status, 200); assert.equal(writes, 1);
    role = 'student'; assert.equal((await request('PUT', '/attendance', payload)).status, 403);
    const history = await request('GET', '/attendance'); assert.equal(history.status, 200);
    const result: any = await history.json(); assert.deepEqual(result.data.items, [{ date: new Date(date).toISOString(), status: 'present' }]);
    assert.ok(!JSON.stringify(result).includes(String(otherStudentId)));
    role = 'parent';
    assert.equal((await request('GET', '/attendance?studentId=' + studentId)).status, 200);
    assert.equal((await request('GET', '/attendance?studentId=' + otherStudentId)).status, 404);
    assert.equal((await request('PUT', '/attendance?studentId=' + studentId, payload)).status, 403);
    role = 'admin'; hasAttendance = true;
    assert.equal((await request('PATCH', '', { startDate: date })).status, 409);
    hasAttendance = false; assert.equal((await request('PATCH', '', { startDate: date })).status, 200);
  } finally {
    User.exists = oldUserExists;
    await new Promise<void>(resolve => server.close(() => resolve()));
    (User as any).findById = old.user; (Teacher as any).findOne = old.teacher; (Student as any).findOne = old.student; (Student as any).find = old.students;
    (AcademicYear as any).findOne = old.year; (Enrollment as any).findOne = old.enrollment; (Enrollment as any).find = old.enrollments; (Course as any).findOne = old.course;
    (CourseAttendance as any).find = old.attendance; (CourseAttendance as any).findOneAndUpdate = old.write; (CourseAttendance as any).exists = old.exists;
  }
});
