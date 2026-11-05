import { Schema, model } from 'mongoose';
const attachment = new Schema({ name: String, type: String, data: { type: Buffer, select: false } });
const activity = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'AcademicCourse', required: true, index: true },
  kind: { type: String, enum: ['material', 'assignment', 'quiz'], required: true },
  title: { type: String, required: true }, body: String,
  dueAt: Date, opensAt: Date, durationMinutes: Number, maxMarks: Number,
  quizType: { type: String, enum: ['mcq', 'written'] },
  questions: [{ prompt: String, options: [String], correct: { type: Number, select: false }, referenceAnswer: { type: String, select: false }, rubric: { type: String, select: false }, marks: Number }],
  expiryProcessedAt: Date,
  attachments: [attachment], createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const CourseActivity = model('CourseActivity', activity);
const submission = new Schema({
  activityId: { type: Schema.Types.ObjectId, ref: 'CourseActivity', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  text: String, answers: [String], attachments: [attachment],
  startedAt: Date, deadline: Date, submittedAt: Date,
  grade: Number, feedback: String, gradedAt: Date,
  draftVersion: { type: Number, default: 0 }, autoSubmitted: Boolean, missed: Boolean,
  quizReviewStatus: { type: String, enum: ['queued', 'grading', 'review', 'error', 'approved'] },
  aiResults: { type: [{ index: Number, marks: Number, feedback: String, _id: false }], select: false },
  aiTotal: { type: Number, select: false }, aiCheckedAt: Date,
  aiError: { type: String, select: false }, gradeLease: { type: Date, select: false }, gradeToken: { type: String, select: false },
  teacherResults: { type: [{ index: Number, marks: Number, feedback: String, _id: false }], select: false },
  draftResults: { type: [{ index: Number, marks: Number, feedback: String, _id: false }], select: false },
  reviewFeedback: { type: String, select: false }, reviewVersion: { type: Number, default: 0 },
  approvedAt: Date, approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvalHistory: { type: [{ at: Date, by: Schema.Types.ObjectId, total: Number, results: [{ index: Number, marks: Number, feedback: String, _id: false }], feedback: String, _id: false }], select: false },
}, { timestamps: true });
submission.index({ activityId: 1, studentId: 1 }, { unique: true });
submission.index({ submittedAt: 1, deadline: 1 });
submission.index({ quizReviewStatus: 1, gradeLease: 1 });
export const CourseWork = model('CourseWork', submission);
const mark = new Schema({ courseId: { type: Schema.Types.ObjectId, ref: 'AcademicCourse', required: true }, studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, marks: Number, maxMarks: Number, feedback: String }, { timestamps: true });
mark.index({ courseId: 1, studentId: 1 }, { unique: true });
export const CourseMark = model('CourseMark', mark);
