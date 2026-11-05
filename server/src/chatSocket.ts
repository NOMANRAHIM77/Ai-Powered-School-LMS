import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from './config/env';
import { User } from './models/User';
import { FamilyMessage } from './models/FamilyMessage';
import { requireContact } from './services/familyChat';

export async function socketIdentity(token: string) {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { _id: string; sessionVersion?: number };
  const user = await User.findById(decoded._id).select('role isActive removedAt sessionVersion');
  if (!user?.isActive || user.removedAt || !['teacher', 'parent'].includes(user.role) || (user.sessionVersion ?? 0) !== (decoded.sessionVersion ?? 0)) throw new Error('Session expired. Sign in again.');
  return { _id: String(user._id), role: user.role };
}
export function attachChat(server: HttpServer) {
  const io = new Server(server, { cors: { origin: env.CLIENT_URL, credentials: true }, maxHttpBufferSize: 20000 });
  io.use(async (socket, next) => { try { socket.data.user = await socketIdentity(socket.handshake.auth.token); next(); } catch { next(new Error('Session expired. Sign in again.')); } });
  io.on('connection', socket => {
    let lastSend = 0;
    socket.on('message:send', async (raw, ack) => {
      if (typeof ack !== 'function') return;
      try {
        const input = z.object({ conversation: z.string().max(100), text: z.string().trim().min(1).max(4000), clientId: z.string().uuid() }).parse(raw);
        const user = await socketIdentity(socket.handshake.auth.token);
        const contact = await requireContact(user, input.conversation);
        if (Date.now() - lastSend < 500) throw new Error('Please wait before sending another message');
        lastSend = Date.now();
        const message = await FamilyMessage.findOneAndUpdate({ senderId: user._id, clientId: input.clientId, conversation: contact.key }, { $setOnInsert: { conversation: contact.key, text: input.text } }, { upsert: true, new: true, runValidators: true });
        // Re-check each recipient session and relationship before delivering; clients cannot join arbitrary rooms.
        for (const peer of io.sockets.sockets.values()) {
          if (![contact.parentId, contact.teacherId].includes(peer.data.user?._id)) continue;
          try { const recipient = await socketIdentity(peer.handshake.auth.token); await requireContact(recipient, contact.key); peer.emit('message:new', message); } catch { peer.disconnect(true); }
        }
        ack({ ok: true, message });
      } catch (error) { ack({ ok: false, error: error instanceof Error ? error.message : 'Unable to send message' }); }
    });
  });
  return io;
}

