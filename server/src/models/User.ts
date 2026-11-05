import mongoose, { Schema, Document, Types } from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/passwords';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  removedAt?: Date;
  sessionVersion: number;
  refreshTokens: string[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'parent'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    removedAt: { type: Date },
    sessionVersion: { type: Number, default: 0 },
    refreshTokens: [{ type: String, select: false }],
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await hashPassword(this.passwordHash);
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return verifyPassword(candidatePassword, this.passwordHash);
};

userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
