import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import routes from '../src/routes/adminUsers.routes';
import { errorHandler } from '../src/middleware/errorHandler';
import { generateAccessToken } from '../src/utils/tokens';
test('admin parent registration requires an active student ID and persists the guardian link', async () => {
  const old = { user: User.findById, exists: User.exists, create: User.create, student: Student.findOne, update: Student.updateOne };
  const admin = new Types.ObjectId(), child = new Types.ObjectId(), childUser = new Types.ObjectId(), parent = new Types.ObjectId(); let linked = false;
  (User as any).findById = () => ({ select: async () => ({ _id: admin, role: 'admin', isActive: true, name: 'Admin', email: 'admin@example.test' }) });
  (User as any).exists = async (filter: any) => filter._id ? { _id: childUser } : null;
  (User as any).create = async (value: any) => ({ ...value, _id: parent });
  (Student as any).findOne = async (filter: any) => filter.studentCode === 'high-cs-11-0001-A' ? { _id: child, userId: childUser } : null;
  (Student as any).updateOne = async (filter: any, update: any) => { assert.equal(String(filter._id), String(child)); assert.equal(String(update.$addToSet.guardianIds), String(parent)); linked = true; return { modifiedCount: 1 }; };
  const app = express(); app.use(express.json()); app.use('/users', routes); app.use(errorHandler); const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(admin), role: 'admin', name: 'Admin', email: 'admin@example.test' });
    const request = (body: any) => fetch(`http://127.0.0.1:${address.port}/users`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = { role: 'parent', name: 'Parent', email: 'parent@example.test', password: 'a' };
    assert.equal((await request(data)).status, 400);
    assert.equal((await request({ ...data, studentCode: 'missing' })).status, 400); assert.equal(linked, false);
    assert.equal((await request({ ...data, studentCode: 'high-cs-11-0001-A' })).status, 201); assert.equal(linked, true);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); User.findById = old.user; User.exists = old.exists; User.create = old.create; Student.findOne = old.student; Student.updateOne = old.update; }
});

