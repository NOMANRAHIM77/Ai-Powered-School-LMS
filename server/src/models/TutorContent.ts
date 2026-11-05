import { Schema, model } from 'mongoose';
export const TutorSource = model('TutorSource', new Schema({
  activityId: { type: Schema.Types.ObjectId, ref: 'CourseActivity', unique: true, required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'AcademicCourse', required: true },
  revision: String, embeddingModel: String, status: String, leaseUntil: Date, chunks: Number, warning: String,
}, { timestamps: true }));
const schema = new Schema({ courseId: { type: Schema.Types.ObjectId, required: true }, activityId: { type: Schema.Types.ObjectId, required: true }, revision: String, model: String, title: String, fileId: String, page: Number, text: String, embedding: { type: [Number], select: false } }, { timestamps: true, collection: 'tutorchunks' });
schema.index({ activityId: 1, revision: 1 });
export const TutorChunk = model('TutorChunk', schema);
