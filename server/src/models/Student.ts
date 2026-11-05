import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  schoolId?: Types.ObjectId;
  userId: Types.ObjectId;
  rollNo: string;
  admissionNo: string;
  studentCode?: string;
  parentName?: string;
  parentPhone?: string;
  admissionDate?: Date;
  dob: Date;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  phone?: string;
  address?: string;
  guardianIds: Types.ObjectId[];
  photo?: string;
  status: 'active' | 'inactive' | 'withdrawn' | 'alumni';
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    schoolId: { type: Schema.Types.ObjectId, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rollNo: { type: String, trim: true },
    admissionNo: { type: String, required: true, unique: true, trim: true },
    studentCode: { type: String, unique: true, sparse: true },
    parentName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    admissionDate: Date,
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    phone: String,
    address: String,
    guardianIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    photo: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'withdrawn', 'alumni'],
      default: 'active',
    },
  },
  { timestamps: true }
);

studentSchema.index({ status: 1 });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
