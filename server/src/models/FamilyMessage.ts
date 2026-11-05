import { Schema, model } from 'mongoose';
const schema = new Schema({ conversation: { type: String, required: true }, senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, text: { type: String, required: true, maxlength: 4000 }, clientId: { type: String, required: true } }, { timestamps: true });
schema.index({ conversation: 1, createdAt: -1 });
schema.index({ senderId: 1, clientId: 1 }, { unique: true });
export const FamilyMessage = model('FamilyMessage', schema);
