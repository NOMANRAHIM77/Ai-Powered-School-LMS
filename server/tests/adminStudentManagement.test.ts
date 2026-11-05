import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import sharp from 'sharp';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { AcademicYear } from '../src/models/AcademicYear';
import { Section } from '../src/models/Section';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';
import routes from '../src/routes/adminUsers.routes';

test('admin student edits validate enrollment and password resets invalidate old sessions', async () => {
  const original = { findById: User.findById, findOne: User.findOne, userExists: User.exists, studentFind: Student.findOne, studentExists: Student.exists, yearFind: AcademicYear.findOne, sectionFind: Section.findById };
  const adminId = new Types.ObjectId(); const studentUserId = new Types.ObjectId(); const studentId = new Types.ObjectId();
  let adminVersion = 0;
  const target = { _id: studentUserId, role: 'student', name: 'Ayesha', email: 'ayesha@example.test', passwordHash: 'old', refreshTokens: ['session'], sessionVersion: 0, save: async () => undefined };
  const student = { _id: studentId, userId: studentUserId, admissionNo: 'S-001', photo: 'existing-photo', save: async () => undefined };
  (User as any).findById = () => ({ select: async () => ({ _id: adminId, role: 'admin', isActive: true, name: 'Admin', email: 'admin@example.test', sessionVersion: adminVersion }) });
  (User as any).findOne = () => Object.assign(Promise.resolve(target), { select: async () => target });
  (Student as any).findOne = async () => student;
  (User as any).exists = async () => null;
  (Student as any).exists = async () => null;
  (AcademicYear as any).findOne = async () => null;
  (Section as any).findById = async () => null;
  const app = express(); app.use(express.json()); app.use('/admin/users', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(adminId), role: 'admin', name: 'Admin', email: 'admin@example.test', sessionVersion: 0 });
    const request = (path: string, body: unknown) => fetch(`http://127.0.0.1:${address.port}/admin/users${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const edit = await request(`/students/${studentUserId}`, { name: 'Ayesha Khan', email: 'ayesha@example.test', admissionNo: 'S-001', dob: '2012-04-15', gender: 'female', sectionId: new Types.ObjectId().toString() });
    assert.equal(edit.status, 400);
    assert.equal(target.name, 'Ayesha');
    const profile = { name: 'Ayesha Khan', email: 'ayesha@example.test', admissionNo: 'S-001', dob: '2012-04-15', gender: 'female' };
    assert.equal((await request(`/students/${studentUserId}`, profile)).status, 200);
    assert.equal(student.photo, 'existing-photo');
    const form = new FormData();
    for (const [key, value] of Object.entries(profile)) form.append(key, value);
    const portrait = await sharp({ create: { width: 50, height: 60, channels: 3, background: '#667788' } }).png().toBuffer();
    form.append('photo', new Blob([new Uint8Array(portrait)], { type: 'image/png' }), 'portrait.png');
    const photoEdit = await fetch(`http://127.0.0.1:${address.port}/admin/users/students/${studentUserId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: form });
    assert.equal(photoEdit.status, 200); assert.match(student.photo, /^data:image\/webp;base64,/);
    const reset = await request(`/students/${studentUserId}/password`, { password: 'a' });
    assert.equal(reset.status, 200);
    assert.equal(target.sessionVersion, 1);
    assert.deepEqual(target.refreshTokens, []);
    adminVersion = 1;
    assert.equal((await request(`/students/${studentUserId}/password`, { password: 'a' })).status, 401);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    (User as any).findById = original.findById; (User as any).findOne = original.findOne; (User as any).exists = original.userExists; (Student as any).findOne = original.studentFind; (Student as any).exists = original.studentExists;
    (AcademicYear as any).findOne = original.yearFind; (Section as any).findById = original.sectionFind;
  }
});
