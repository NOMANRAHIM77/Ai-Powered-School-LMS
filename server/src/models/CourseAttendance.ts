import { Schema, model } from 'mongoose';
const schema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'AcademicCourse', required: true },
  date: { type: Date, required: true },
  records: [{ studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true } }],
  markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
schema.index({ courseId: 1, date: 1 }, { unique: true });
export const CourseAttendance = model('CourseAttendance', schema);
