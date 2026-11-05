import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  voucherId: Types.ObjectId;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  transactionId?: string;
  receivedBy: Types.ObjectId;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    voucherId: { type: Schema.Types.ObjectId, ref: 'FeeVoucher', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'online'],
      required: true,
    },
    transactionId: String,
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    notes: String,
  },
  { timestamps: true }
);

paymentSchema.index({ voucherId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
