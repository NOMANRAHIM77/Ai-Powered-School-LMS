import { Schema, model } from 'mongoose';

const question = new Schema({
  prompt: String, options: [String], correct: Number, answer: String, explanation: String,
  source: { title: String, activityId: String, fileId: String, page: Number, quote: String },
}, { _id: false });
const schema = new Schema({
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'AcademicCourse' },
  studentId: { type: Schema.Types.ObjectId, required: true, ref: 'Student' },
  materials: [{ activityId: String, title: String }],
  kind: { type: String, enum: ['mcq', 'written', 'flashcards'], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  questionCount: { type: Number, required: true }, durationMinutes: Number,
  questions: { type: [question], select: false },
  status: { type: String, enum: ['ready', 'active', 'grading', 'completed'], required: true },
  answers: { type: [String], default: [] }, draftVersion: { type: Number, default: 0 },
  startedAt: Date, deadline: Date, submittedAt: Date, completedAt: Date,
  gradeLease: Date, gradeToken: String, gradeError: String,
  score: Number, percentage: Number,
  results: [{ points: Number, feedback: String, _id: false }],
  mastered: { type: [Number], default: [] },
}, { timestamps: true });
schema.index({ studentId: 1, courseId: 1, createdAt: -1 });
schema.index({ status: 1, deadline: 1 });
export const PersonalizedQuiz = model('PersonalizedQuiz', schema);
