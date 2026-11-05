import { Schema, model } from 'mongoose';

const announcementSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 10000 },
  audience: { type: String, enum: ['student', 'teacher', 'parent', 'all'], required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  attachment: { name: String, contentType: String, data: { type: Buffer, select: false } },
}, { timestamps: true });

export const Announcement = model('Announcement', announcementSchema);
