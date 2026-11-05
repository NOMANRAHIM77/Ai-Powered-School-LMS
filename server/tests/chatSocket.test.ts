import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'http';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { FamilyMessage } from '../src/models/FamilyMessage';
import * as access from '../src/services/familyChat';
import { attachChat } from '../src/chatSocket';
import { generateAccessToken } from '../src/utils/tokens';
const { io: client } = require('socket.io-client');

test('socket chat delivers persisted messages live and rejects unrelated conversations', async () => {
  const parentId = String(new Types.ObjectId()), teacherId = String(new Types.ObjectId()); const key = `${new Types.ObjectId()}:${parentId}:${teacherId}`;
  const old = { user: User.findById, access: access.requireContact, write: FamilyMessage.findOneAndUpdate };
  let writes = 0;
  (User as any).findById = (id: string) => ({ select: async () => ({ _id: id, role: id === parentId ? 'parent' : 'teacher', isActive: true, sessionVersion: 0 }) });
  (access as any).requireContact = async (user: any, conversation: string) => { if (conversation !== key || ![parentId, teacherId].includes(user._id)) throw new Error('Forbidden conversation'); return { key, parentId, teacherId }; };
  (FamilyMessage as any).findOneAndUpdate = async (filter: any, update: any) => { writes++; assert.equal(filter.conversation, key); return { _id: String(new Types.ObjectId()), senderId: filter.senderId, ...update.$setOnInsert, createdAt: new Date().toISOString() }; };
  const http = createServer(); const io = attachChat(http); http.listen(0, '127.0.0.1'); const clients: any[] = [];
  try {
    await new Promise<void>(resolve => http.once('listening', resolve)); const address = http.address(); assert.ok(address && typeof address !== 'string');
    for (const [id, role] of [[parentId, 'parent'], [teacherId, 'teacher']] as const) {
      const socket = client(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], auth: { token: generateAccessToken({ _id: id, role, name: role, email: `${role}@example.test` }) } }); clients.push(socket);
      await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Connection timeout')), 5000); socket.once('connect', () => { clearTimeout(timer); resolve(); }); socket.once('connect_error', (e: Error) => { clearTimeout(timer); reject(e); }); });
    }
    const delivered = new Promise<any>((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Delivery timeout')), 5000); clients[1].once('message:new', (message: any) => { clearTimeout(timer); resolve(message); }); });
    const send = (conversation: string) => new Promise<any>((resolve, reject) => clients[0].timeout(5000).emit('message:send', { conversation, text: 'Hello teacher', clientId: crypto.randomUUID() }, (error: Error, response: any) => error ? reject(error) : resolve(response)));
    const response = await send(key); assert.equal(response.ok, true); assert.equal((await delivered).text, 'Hello teacher'); assert.equal(writes, 1);
    const denied = await send('unrelated'); assert.equal(denied.ok, false); assert.equal(writes, 1);
  } finally { clients.forEach(c => c.disconnect()); await new Promise<void>(resolve => io.close(() => resolve())); User.findById = old.user; (access as any).requireContact = old.access; FamilyMessage.findOneAndUpdate = old.write; }
});
