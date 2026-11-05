import mongoose, { Schema, Document, Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

export interface IAttendanceRecord {
  studentId: Types.ObjectId;
  status: AttendanceStatus;
}

export interface IAttendance extends Document {
  sectionId: Types.ObjectId;
  date: Date;
  records: IAttendanceRecord[];
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    date: { type: Date, required: true },
    records: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        status: {
          type: String,
          enum: ['present', 'absent', 'late', 'leave', 'holiday'],
          default: 'present',
        },
      },
    ],
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same section+date
attendanceSchema.index({ sectionId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
