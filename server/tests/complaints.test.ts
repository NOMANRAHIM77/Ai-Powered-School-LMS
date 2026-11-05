import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { Complaint } from '../src/models/Complaint';
import routes, { createComplaintWithReference, complaintFile } from '../src/routes/complaints.routes';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';

test('complaint references retry collisions and reject unsupported attachments', async () => {
  const old = { distinct: Complaint.distinct, create: Complaint.create };
  let attempts = 0;
  (Complaint as any).distinct = async () => ['1000'];
  (Complaint as any).create = async (input: any) => { attempts++; assert.match(input.reference, /^[1-9]\d{3}$/); assert.notEqual(input.reference, '1000'); if (attempts === 1) throw { code: 11000, keyPattern: { reference: 1 } }; return input; };
  try {
    const item = await createComplaintWithReference({ title: 'Test' }); assert.equal(item.title, 'Test'); assert.equal(attempts, 2);
    assert.throws(() => complaintFile({ buffer: Buffer.from('<html>'), mimetype: 'text/html', originalname: 'bad.html' } as any), /Attachments must/);
    assert.equal(complaintFile({ buffer: Buffer.from('%PDF-test'), mimetype: 'application/pdf', originalname: 'evidence.pdf' } as any).contentType, 'application/pdf');
    (Complaint as any).distinct = async () => Array.from({ length: 9000 }, (_, i) => String(i + 1000));
    await assert.rejects(createComplaintWithReference({}), /All four-digit/);
  } finally { (Complaint as any).distinct = old.distinct; (Complaint as any).create = old.create; }
});

test('students submit complaints and can only read their own; only admins add remarks and resolve', async () => {
  const old = { user: User.findById, student: Student.findOne, find: Complaint.findOne, distinct: Complaint.distinct, create: Complaint.create, update: Complaint.findOneAndUpdate };
  const userId = new Types.ObjectId(); const studentId = new Types.ObjectId(); const complaintId = new Types.ObjectId(); const fileId = new Types.ObjectId();
  let role: 'student' | 'admin' | 'teacher' = 'student'; let saved: any; let update: any;
  (User as any).findById = () => ({ select: async () => ({ _id: userId, role, name: 'Test', email: 'test@example.test', isActive: true }) });
  (Student as any).findOne = async (filter: any) => { assert.equal(filter.userId, String(userId)); return { _id: studentId }; };
  (Complaint as any).distinct = async () => [];
  (Complaint as any).create = async (input: any) => { saved = input; return { ...input, _id: complaintId }; };
  (Complaint as any).findOne = (filter: any) => {
    if (role === 'student') assert.equal(filter.userId, String(userId)); else assert.equal(filter.userId, undefined);
    const query: any = { select: () => query, populate: () => query, then: (resolve: any) => Promise.resolve(null).then(resolve) }; return query;
  };
  (Complaint as any).findOneAndUpdate = (_filter: any, input: any) => { update = input; return { select: async () => ({ _id: complaintId, reference: '1234', status: input.$set.status }) }; };
  const app = express(); app.use(express.json()); app.use('/complaints', routes); app.use(errorHandler); const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(userId), role: 'student', name: 'Test', email: 'test@example.test' });
    const url = `http://127.0.0.1:${address.port}/complaints`;
    const request = (method: string, path: string, body?: any) => fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const form = new FormData(); form.append('title', 'Broken classroom chair'); form.append('category', 'Facilities'); form.append('description', 'Please repair the chair.'); form.append('files', new Blob(['evidence'], { type: 'text/plain' }), 'evidence.txt');
    const created = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }); assert.equal(created.status, 201);
    assert.equal(saved.userId, String(userId)); assert.equal(String(saved.studentId), String(studentId)); assert.equal(saved.attachments.length, 1);
    assert.match((await created.json() as any).data.reference, /^[1-9]\d{3}$/);
    assert.equal((await request('GET', `/${complaintId}`)).status, 404);
    assert.equal((await request('GET', `/${complaintId}/files/${fileId}`)).status, 404);
    assert.equal((await request('PATCH', `/${complaintId}`, { remark: 'Done', status: 'resolved' })).status, 403);
    role = 'teacher'; assert.equal((await request('GET', `/${complaintId}`)).status, 403);
    role = 'admin';
    assert.equal((await request('PATCH', `/${complaintId}`, { remark: '', status: 'resolved' })).status, 400);
    assert.equal((await request('PATCH', `/${complaintId}`, { remark: 'Chair repaired', status: 'resolved' })).status, 200);
    assert.equal(update.$push.updates.remark, 'Chair repaired'); assert.equal(update.$push.updates.authorId, String(userId)); assert.ok(update.$set.resolvedAt instanceof Date);
    assert.equal((await request('PATCH', `/${complaintId}`, { remark: 'Issue returned', status: 'unresolved' })).status, 200); assert.equal(update.$set.resolvedAt, null);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    (User as any).findById = old.user; (Student as any).findOne = old.student; (Complaint as any).findOne = old.find; (Complaint as any).distinct = old.distinct; (Complaint as any).create = old.create; (Complaint as any).findOneAndUpdate = old.update;
  }
});
