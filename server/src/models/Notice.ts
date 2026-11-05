import mongoose, { Schema, Document, Types } from 'mongoose';

export type NoticeAudience = 'all' | 'admin' | 'teacher' | 'student' | 'parent';

export interface INotice extends Document {
  title: string;
  body: string;
  audience: NoticeAudience;
  classIds?: Types.ObjectId[]; // null = school-wide
  isPinned: boolean;
  isActive: boolean;
  attachments?: string[];
  createdBy: Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: {
      type: String,
      enum: ['all', 'admin', 'teacher', 'student', 'parent'],
      default: 'all',
    },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    attachments: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: Date,
  },
  { timestamps: true }
);

noticeSchema.index({ audience: 1, isActive: 1, createdAt: -1 });

export const Notice = mongoose.model<INotice>('Notice', noticeSchema);
