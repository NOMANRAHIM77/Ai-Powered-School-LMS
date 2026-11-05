import { Schema, model } from 'mongoose';
const schema = new Schema({
  reference: { type: String, required: true, unique: true, match: /^\d{4}$/ },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 160 },
  category: { type: String, required: true },
  description: { type: String, required: true, maxlength: 10000 },
  incidentDate: Date,
  location: String,
  status: { type: String, enum: ['unresolved', 'resolved'], default: 'unresolved', index: true },
  resolvedAt: { type: Date, default: null },
  attachments: [{ name: String, contentType: String, data: { type: Buffer, select: false } }],
  updates: [{ remark: String, status: { type: String, enum: ['unresolved', 'resolved'] }, authorId: { type: Schema.Types.ObjectId, ref: 'User' }, date: { type: Date, default: Date.now } }],
}, { timestamps: true });
export const Complaint = model('Complaint', schema);
