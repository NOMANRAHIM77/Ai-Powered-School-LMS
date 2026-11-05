import mongoose, { Schema, Types } from 'mongoose';

export interface IStudentPreferences {
  studentId: Types.ObjectId;
  language: 'en' | 'ur';
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  inAppNotifications: boolean;
  reducedMotion: boolean;
}

const schema = new Schema<IStudentPreferences>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  language: { type: String, enum: ['en', 'ur'], default: 'en' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  emailNotifications: { type: Boolean, default: true },
  inAppNotifications: { type: Boolean, default: true },
  reducedMotion: { type: Boolean, default: false },
}, { timestamps: true });

export const StudentPreferences = mongoose.model<IStudentPreferences>('StudentPreferences', schema);
