import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code?: string;
  classId: Types.ObjectId;
  teacherId?: Types.ObjectId;
  colorIndex: number; // 0-5, maps to chart palette
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    colorIndex: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

subjectSchema.index({ classId: 1 });

export const Subject = mongoose.model<ISubject>('Subject', subjectSchema);
