import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { AcademicYear } from '../src/models/AcademicYear';
import { Class } from '../src/models/Class';
import { Section } from '../src/models/Section';
import { Enrollment } from '../src/models/Enrollment';
import { generateAccessToken } from '../src/utils/tokens';
import { ApiError } from '../src/utils/apiHelpers';
import { errorHandler } from '../src/middleware/errorHandler';
import routes from '../src/routes/adminUsers.routes';
import * as identity from '../src/utils/studentIdentity';

test('admin can remove and register the same student again without losing linked records or reviving old sessions', async () => {
  const originalIdentity = identity.nextStudentIdentity; (identity as any).nextStudentIdentity = async () => 'pri-gen-8-0001-A';
  const old = { byId: User.findById, userOne: User.findOne, userExists: User.exists, studentOne: Student.findOne, studentExists: Student.exists, year: AcademicYear.findOne, classOne: Class.findOne, section: Section.findById, enrollment: Enrollment.findOneAndUpdate };
  const adminId = new Types.ObjectId(); const studentId = new Types.ObjectId(); const userId = new Types.ObjectId();
  const yearId = new Types.ObjectId(); const classId = new Types.ObjectId(); const sectionId = new Types.ObjectId();
  const user: any = { _id: userId, role: 'student', name: 'Ayesha', email: 'student@example.test', isActive: true, sessionVersion: 0, refreshTokens: ['old-session'], passwordResetToken: 'old-reset', passwordResetExpires: new Date(), save: async () => undefined };
  const student: any = { _id: studentId, userId, admissionNo: 'S-001', photo: 'existing-photo', save: async () => undefined };
  const admin = { _id: adminId, role: 'admin', isActive: true, name: 'Admin', email: 'admin@example.test', sessionVersion: 0 };
  let enrollmentWrite: any; let failEnrollment = false;
  (User as any).findById = (id: string) => ({ select: async () => String(id) === String(adminId) ? admin : user });
  (User as any).exists = async (query: any) => query.email === user.email ? { _id: userId } : null;
  (User as any).findOne = (query: any) => ({ select: async () => {
    if (query.isActive === false && user.isActive) return null;
    if (query.removedAt === null && user.removedAt) return null;
    if (query.removedAt?.$ne === null && !user.removedAt) return null;
    return user;
  } });
  (Student as any).findOne = async () => student;
  (Student as any).exists = async (query: any) => query.admissionNo === student.admissionNo ? { _id: studentId } : null;
  (AcademicYear as any).findOne = async () => ({ _id: yearId });
  (Section as any).findById = async () => ({ _id: sectionId, classId, name: 'A' });
  (Class as any).findOne = async () => ({ _id: classId, name: 'Grade 8' });
  (Enrollment as any).findOneAndUpdate = async (filter: any, update: any, options: any) => {
    if (failEnrollment) throw new ApiError(503, 'Enrollment unavailable');
    enrollmentWrite = { filter, update, options }; return {};
  };
  const app = express(); app.use(express.json()); app.use('/admin/users', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ ...admin, _id: String(adminId), role: 'admin' });
    const previousToken = generateAccessToken({ _id: String(userId), role: 'student', name: user.name, email: user.email, sessionVersion: 0 });
    const url = `http://127.0.0.1:${address.port}/admin/users`;
    const request = (method: string, path: string, body?: unknown) => fetch(`${url}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const details = { role: 'student', parentName: 'Guardian', parentPhone: '03001234567', name: 'Ayesha Khan', email: 'STUDENT@example.test', password: 'a', admissionNo: 'S-001', dob: '2012-04-15', gender: 'female', wing: 'primary', sectionId: String(sectionId) };
    assert.equal((await request('POST', '', details)).status, 409);
    assert.equal((await request('DELETE', `/students/${userId}`)).status, 200);
    assert.equal(user.isActive, false); assert.ok(user.removedAt);
    assert.equal((await request('POST', '', { ...details, admissionNo: 'S-002' })).status, 409);
    assert.equal((await request('POST', '', { ...details, email: 'different@example.test' })).status, 409);
    assert.equal((await request('POST', '', { ...details, wing: 'higher' })).status, 400);
    failEnrollment = true;
    assert.equal((await request('POST', '', details)).status, 503);
    assert.equal(user.isActive, false); assert.ok(user.removedAt);
    failEnrollment = false;
    const restored = await request('POST', '', details); assert.equal(restored.status, 201);
    const result: any = await restored.json();
    assert.equal(result.data.restored, true); assert.equal(result.data._id, String(userId));
    assert.equal(result.data.passwordHash, undefined);
    assert.equal(user.isActive, true); assert.equal(user.removedAt, undefined);
    assert.equal(user.name, details.name); assert.equal(user.passwordHash, 'a');
    assert.equal(user.sessionVersion, 2); assert.deepEqual(user.refreshTokens, []);
    assert.equal(user.passwordResetToken, undefined); assert.equal(user.passwordResetExpires, undefined);
    assert.equal(student.photo, 'existing-photo'); assert.equal(student.status, 'active');
    assert.deepEqual(enrollmentWrite.filter, { studentId, academicYearId: yearId });
    assert.deepEqual(enrollmentWrite.update.$set, { sectionId, status: 'active' });
    assert.equal(enrollmentWrite.options.upsert, true);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${previousToken}` } })).status, 401);
    assert.equal((await request('POST', '', details)).status, 409);
  } finally {
    (identity as any).nextStudentIdentity = originalIdentity;
    await new Promise<void>(resolve => server.close(() => resolve()));
    (User as any).findById = old.byId; (User as any).findOne = old.userOne; (User as any).exists = old.userExists;
    (Student as any).findOne = old.studentOne; (Student as any).exists = old.studentExists;
    (AcademicYear as any).findOne = old.year; (Class as any).findOne = old.classOne; (Section as any).findById = old.section; (Enrollment as any).findOneAndUpdate = old.enrollment;
  }
});

