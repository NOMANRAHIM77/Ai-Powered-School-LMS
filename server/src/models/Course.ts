import { Schema, model } from 'mongoose';
const schema = new Schema({
  subjectName: { type: String, required: true },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', default: null },
  startDate: { type: Date, default: null },
}, { timestamps: true });
schema.index({ academicYearId: 1, sectionId: 1, subjectName: 1 }, { unique: true });
// Academic subject assignments are separate from the published learning courses
// in StudentLearning.ts. They must not share a model name or MongoDB collection.
export const Course = model('AcademicCourse', schema, 'academiccourses');
