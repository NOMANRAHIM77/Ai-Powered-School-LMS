import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISection extends Document {
  name: string;
  classId: Types.ObjectId;
  classTeacherId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    name: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
  },
  { timestamps: true }
);

sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

export const Section = mongoose.model<ISection>('Section', sectionSchema);
