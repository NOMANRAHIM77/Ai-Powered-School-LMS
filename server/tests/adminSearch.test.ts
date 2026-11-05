import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import express from 'express';
import { parseSmartPlan, validateSmartPlan, smartSections, smartAccountFilter, smartCourseFilter, attendancePipeline, interpretSearch, describeSearch } from '../src/services/adminSearch';
import { Class } from '../src/models/Class';
import { Section } from '../src/models/Section';
import { User } from '../src/models/User';
import { Teacher } from '../src/models/Teacher';
import { Student } from '../src/models/Student';
import { AcademicYear } from '../src/models/AcademicYear';
import { CourseAttendance } from '../src/models/CourseAttendance';
import * as tutor from '../src/services/courseTutor';
import routes from '../src/routes/adminSearch.routes';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';

test('smart plans are strict, role-specific and never accept database operators', () => {
  assert.throws(() => parseSmartPlan('{bad}', 'student'));
  assert.throws(() => validateSmartPlan({ target: 'student', filters: { $where: 'return true' } }, 'student'));
  assert.throws(() => validateSmartPlan({ target: 'student', filters: { name: { $ne: null } } }, 'student'));
  assert.throws(() => validateSmartPlan({ target: 'student', filters: { attendance: { operator: 'lt', percent: 101 } } }, 'student'));
  assert.throws(() => validateSmartPlan({ target: 'courses', filters: { teacher: 'Ahmed' } }, 'parent'));
  assert.throws(() => validateSmartPlan({ target: 'parent', filters: { attendance: { operator: 'lt', percent: 70 } } }, 'parent'));
  assert.throws(() => validateSmartPlan({ target: 'student', filters: { attendance: { operator: 'lt', percent: 70, from: '2026-11-03', to: '2026-11-01' } } }, 'student'));
  assert.match(describeSearch({ target: 'student', filters: { attendance: { operator: 'lt', percent: 70 } } }), /< 70%.*Current academic year/);
});
test('course searches combine teacher, class, stream and section with escaped literal names', async () => {
  const old = { classes: Class.find, sections: Section.distinct, users: User.distinct, teachers: Teacher.distinct };
  const year = new Types.ObjectId(), teacherUser = new Types.ObjectId(), teacher = new Types.ObjectId();
  const section = new Types.ObjectId(), class11 = new Types.ObjectId(); let userQuery: any;
  (Class as any).find = (query: any) => { assert.equal(query.academicYearId, year); return { select: () => ({ lean: async () => [{ _id: class11, name: 'Grade 11' }, { _id: 'other', name: 'Grade 8' }] }) }; };
  (Section as any).distinct = async (_: any, query: any) => { assert.deepEqual(query.classId.$in, [class11]); assert.ok(query.name.test('Computer Science - A')); assert.equal(query.name.test('Computer Science - B'), false); assert.equal(query.name.test('Medical - A'), false); return [section]; };
  (User as any).distinct = async (_: any, query: any) => { userQuery = query; return [teacherUser]; };
  (Teacher as any).distinct = async (_: any, query: any) => { assert.deepEqual(query.userId.$in, [teacherUser]); return [teacher]; };
  try {
    const result = await smartCourseFilter({ target: 'courses', filters: { teacher: 'A.*', grade: 11, stream: 'Computer Science', section: 'A', subject: 'Math' } }, year);
    assert.deepEqual(result.sectionId.$in, [section]); assert.deepEqual(result.teacherId.$in, [teacher]); assert.ok(result.subjectName.test('Math'));
    assert.equal(userQuery.removedAt, null); assert.equal(userQuery.role, 'teacher'); assert.ok(userQuery.$or[0].name.test('A.*')); assert.equal(userQuery.$or[0].name.test('Ahmed'), false);
  } finally { Class.find = old.classes; Section.distinct = old.sections; User.distinct = old.users; Teacher.distinct = old.teachers; }
});
test('parent matching follows guardian links and returns no accounts when child is unknown', async () => {
  const old = { users: User.distinct, students: Student.find };
  const user = new Types.ObjectId(), parent = new Types.ObjectId(); let found = true;
  (User as any).distinct = async (_: any, query: any) => { assert.equal(query.role, 'student'); assert.equal(query.removedAt, null); return [user]; };
  (Student as any).find = (query: any) => { assert.equal(query.$and[0].$or[0].studentCode.test('high-cs-11-0001-A'), true); assert.deepEqual(query.$and[1].userId.$in, [user]); return { select: () => ({ lean: async () => found ? [{ _id: 'student', userId: user, guardianIds: [parent] }] : [] }) }; };
  try {
    const plan = { target: 'parent' as const, filters: { student: 'Ali', studentCode: 'high,cs,11,0001,A' } };
    const result = await smartAccountFilter(plan); assert.deepEqual(result.filter.$and.at(-1)._id.$in, [parent]);
    found = false; assert.deepEqual((await smartAccountFilter(plan)).filter.$and.at(-1)._id.$in, []);
  } finally { User.distinct = old.users; Student.find = old.students; }
});
test('attendance search uses current enrollment and exact recorded-session percentages and returns evidence', async () => {
  const old = { year: AcademicYear.findOne, attendance: CourseAttendance.aggregate, users: User.distinct, students: Student.find };
  const yearId = new Types.ObjectId(), studentId = new Types.ObjectId(), userId = new Types.ObjectId();
  const pipeline = attendancePipeline(yearId, { operator: 'lt', percent: 70 });
  assert.equal(pipeline.find(p => p.$match?.['course.academicYearId'])!.$match['course.academicYearId'], yearId);
  assert.deepEqual(pipeline.at(-1), { $match: { percentage: { $lt: 70 } } });
  assert.deepEqual(pipeline.find(p => p.$group)!.$group.attended.$sum.$cond[0], { $in: ['$records.status', ['present', 'late']] });
  assert.equal(pipeline.find(p => p.$lookup?.let)!.$lookup.pipeline[0].$match.status, 'active');
  (AcademicYear as any).findOne = () => ({ select: async () => ({ _id: yearId }) });
  (CourseAttendance as any).aggregate = () => ({ option: async () => [{ _id: studentId, attended: 2, total: 3, percentage: 200 / 3 }] });
  (User as any).distinct = async () => [userId];
  (Student as any).find = (query: any) => { assert.deepEqual(query.$and[0]._id.$in, [studentId]); return { select: () => ({ lean: async () => [{ _id: studentId, userId, guardianIds: [] }] }) }; };
  try {
    const result = await smartAccountFilter({ target: 'student', filters: { attendance: { operator: 'lt', percent: 70 } } });
    assert.deepEqual(result.filter.$and.at(-1)._id.$in, [userId]); assert.deepEqual(result.attendanceByUser[String(userId)], { attended: 2, total: 3, percentage: 66.67 });
  } finally { AcademicYear.findOne = old.year; CourseAttendance.aggregate = old.attendance; User.distinct = old.users; Student.find = old.students; }
});
test('AI interpretations validate constraints and ask for clarification instead of silently dropping them', async () => {
  const old = tutor.groq; let result: any = { filters: { attendance: { operator: 'lt', percent: 70 } }, clarification: null };
  (tutor as any).groq = async (_: any, payload: any) => { assert.equal(JSON.parse(payload.messages[1].content).target, 'student'); return { choices: [{ message: { content: JSON.stringify(result) } }] }; };
  try {
    assert.equal((await interpretSearch('student', 'Show attendance below 70 percent')).plan.filters.attendance?.operator, 'lt');
    result = { filters: {}, clarification: 'Which attendance percentage should I use?' }; await assert.rejects(interpretSearch('student', 'Show low attendance'), /Which attendance/);
    result = { filters: { password: 'secret' }, clarification: null }; await assert.rejects(interpretSearch('student', 'Show passwords'), /unsupported filters/);
  } finally { (tutor as any).groq = old; }
});
test('only authenticated administrators can interpret searches', async () => {
  const old = User.findById; let role = 'student'; const userId = new Types.ObjectId();
  (User as any).findById = () => ({ select: async () => ({ _id: userId, role, isActive: true }) });
  const app = express(); app.use(express.json()); app.use('/search', routes); app.use(errorHandler); const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(userId), role: 'student', name: 'Test', email: 'test@example.test' });
    const request = (authorized: boolean) => fetch(`http://127.0.0.1:${address.port}/search/interpret`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ target: 'student', query: 'x' }) });
    assert.equal((await request(false)).status, 401); assert.equal((await request(true)).status, 403); role = 'admin'; assert.equal((await request(true)).status, 400);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); User.findById = old; }
});
