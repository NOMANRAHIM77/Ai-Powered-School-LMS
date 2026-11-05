import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeacher extends Document {
  userId: Types.ObjectId;
  employeeId: string;
  phone?: string;
  address?: string;
  qualification?: string;
  joinDate?: Date;
  subjects: Types.ObjectId[];
  subjectNames: string[];
  wing?: 'primary' | 'secondary' | 'higher';
  sectionIds: Types.ObjectId[];
  assignmentAcademicYearId?: Types.ObjectId;
  photo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    phone: String,
    address: String,
    qualification: String,
    joinDate: Date,
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    subjectNames: [{ type: String }],
    wing: { type: String, enum: ['primary', 'secondary', 'higher'] },
    sectionIds: [{ type: Schema.Types.ObjectId, ref: 'Section' }],
    assignmentAcademicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear' },
    photo: String,
  },
  { timestamps: true }
);

export const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);
