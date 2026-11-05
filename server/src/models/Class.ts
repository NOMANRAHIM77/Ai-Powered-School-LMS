import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClass extends Document {
  name: string;
  academicYearId: Types.ObjectId;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

classSchema.index({ academicYearId: 1, name: 1 }, { unique: true });

export const Class = mongoose.model<IClass>('Class', classSchema);
