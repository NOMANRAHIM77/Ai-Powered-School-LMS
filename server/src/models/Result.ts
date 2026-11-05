import mongoose, { Schema, Document, Types } from 'mongoose';

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface IMarkEntry {
  subjectId: Types.ObjectId;
  obtained: number;
  grade?: Grade;
  remarks?: string;
}

export interface IResult extends Document {
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  marks: IMarkEntry[];
  totalObtained: number;
  totalMarks: number;
  percentage: number;
  grade: Grade;
  position?: number;
  isPassed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IResult>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    marks: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        obtained: { type: Number, required: true, min: 0 },
        grade: {
          type: String,
          enum: ['A+', 'A', 'B', 'C', 'D', 'F'],
        },
        remarks: String,
      },
    ],
    totalObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    grade: { type: String, enum: ['A+', 'A', 'B', 'C', 'D', 'F'], default: 'F' },
    position: Number,
    isPassed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const Result = mongoose.model<IResult>('Result', resultSchema);
