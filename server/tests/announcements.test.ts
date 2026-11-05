import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { Announcement } from '../src/models/Announcement';
import { User } from '../src/models/User';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';
import routes from '../src/routes/announcements.routes';

test('announcement access uses the signed-in role and only admins can publish', async () => {
  const oldFindUser = User.findById; const oldFind = Announcement.find; const oldCount = Announcement.countDocuments; const oldCreate = Announcement.create;
  const id = new Types.ObjectId(); let role: 'admin' | 'teacher' | 'parent' = 'teacher'; let filter: any; let created: any;
  (User as any).findById = () => ({ select: async () => ({ _id: id, role, isActive: true, name: 'User', email: 'user@example.test', sessionVersion: 0 }) });
  (Announcement as any).find = (query: any) => { filter = query; return { select: () => ({ sort: () => ({ lean: async () => [] }) }) }; };
  (Announcement as any).countDocuments = async () => 0;
  (Announcement as any).create = async (value: any) => { created = value; return { _id: new Types.ObjectId() }; };
  const app = express(); app.use('/announcements', routes); app.use(errorHandler); const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const token = generateAccessToken({ _id: String(id), role: 'teacher', name: 'User', email: 'user@example.test', sessionVersion: 0 });
    const base = `http://127.0.0.1:${address.port}/announcements`; const headers = { Authorization: `Bearer ${token}` };
    assert.equal((await fetch(base, { headers })).status, 200);
    assert.deepEqual(filter.audience, { $in: ['all', 'teacher'] });
    const body = () => { const form = new FormData(); form.set('title', 'School update'); form.set('body', 'Hello'); form.set('audience', 'student'); return form; };
    assert.equal((await fetch(base, { method: 'POST', headers, body: body() })).status, 403);
    role = 'parent';
    assert.equal((await fetch(base, { headers })).status, 200);
    assert.deepEqual(filter.audience, { $in: ['all', 'parent', 'student'] });
    role = 'admin';
    const before = Date.now();
    assert.equal((await fetch(base, { method: 'POST', headers, body: body() })).status, 201);
    assert.equal(created.audience, 'student');
    assert.ok(created.expiresAt.getTime() >= before + 48 * 60 * 60 * 1000);
    const invalid = body(); invalid.set('file', new Blob(['not an image'], { type: 'image/png' }), 'file.png');
    assert.equal((await fetch(base, { method: 'POST', headers, body: invalid })).status, 400);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    (User as any).findById = oldFindUser; (Announcement as any).find = oldFind; (Announcement as any).countDocuments = oldCount; (Announcement as any).create = oldCreate;
  }
});
