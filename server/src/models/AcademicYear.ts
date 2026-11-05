import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademicYear extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only one year can be current
academicYearSchema.pre('save', async function (next) {
  if (this.isCurrent) {
    await AcademicYear.updateMany({ _id: { $ne: this._id } }, { isCurrent: false });
  }
  next();
});

export const AcademicYear = mongoose.model<IAcademicYear>('AcademicYear', academicYearSchema);
