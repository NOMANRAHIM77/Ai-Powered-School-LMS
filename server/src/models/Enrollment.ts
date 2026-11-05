import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEnrollment extends Document {
  studentId: Types.ObjectId;
  sectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  status: 'active' | 'promoted' | 'withdrawn' | 'failed';
  rollNo?: string;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    status: {
      type: String,
      enum: ['active', 'promoted', 'withdrawn', 'failed'],
      default: 'active',
    },
    rollNo: String,
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A student can only be enrolled once per academic year
enrollmentSchema.index({ studentId: 1, academicYearId: 1 }, { unique: true });
enrollmentSchema.index({ sectionId: 1, academicYearId: 1 });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
