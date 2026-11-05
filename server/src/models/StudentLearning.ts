import mongoose, { Schema, Types } from 'mongoose';

const courseSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, maxlength: 2000 },
  sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  published: { type: Boolean, default: false },
}, { timestamps: true });
courseSchema.index({ sectionId: 1, published: 1, createdAt: -1 });

const lessonSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, default: '', maxlength: 100000 },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: false },
}, { timestamps: true });
lessonSchema.index({ courseId: 1, published: 1, order: 1 });

const lessonProgressSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  completed: { type: Boolean, default: false },
  bookmarked: { type: Boolean, default: false },
  note: { type: String, default: '', maxlength: 10000 },
}, { timestamps: true });
lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });

const assignmentSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  instructions: { type: String, default: '', maxlength: 30000 },
  dueAt: { type: Date, required: true },
  allowLate: { type: Boolean, default: false },
  allowResubmit: { type: Boolean, default: false },
  published: { type: Boolean, default: false },
}, { timestamps: true });
assignmentSchema.index({ courseId: 1, published: 1, dueAt: 1 });

const submissionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, index: true },
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  text: { type: String, default: '', maxlength: 30000 },
  status: { type: String, enum: ['draft', 'submitted', 'late', 'graded'], default: 'draft' },
  submittedAt: Date,
  grade: Number,
  feedback: String,
}, { timestamps: true });
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const leaveSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });
leaveSchema.index({ studentId: 1, createdAt: -1 });

export const Course = mongoose.model('Course', courseSchema);
export const Lesson = mongoose.model('Lesson', lessonSchema);
export const LessonProgress = mongoose.model('LessonProgress', lessonProgressSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const Submission = mongoose.model('Submission', submissionSchema);
export const LeaveRequest = mongoose.model('LeaveRequest', leaveSchema);
