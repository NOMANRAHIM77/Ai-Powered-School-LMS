import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExamSubject {
  subjectId: Types.ObjectId;
  totalMarks: number;
  passingMarks: number;
}

export interface IExam extends Document {
  name: string;
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  subjects: IExamSubject[];
  startDate: Date;
  endDate?: Date;
  isPublished: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const examSchema = new Schema<IExam>(
  {
    name: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    subjects: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        totalMarks: { type: Number, required: true, min: 1 },
        passingMarks: { type: Number, required: true, min: 0 },
      },
    ],
    startDate: { type: Date, required: true },
    endDate: Date,
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

examSchema.index({ classId: 1, academicYearId: 1 });

export const Exam = mongoose.model<IExam>('Exam', examSchema);
