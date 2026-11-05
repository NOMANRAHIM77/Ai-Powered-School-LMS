import mongoose, { Schema, Document, Types } from 'mongoose';

export type VoucherStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived';

export interface IFeeVoucher extends Document {
  studentId: Types.ObjectId;
  month: number; // 1-12
  year: number;
  items: Array<{ title: string; amount: number }>;
  total: number;
  paid: number;
  discount: number;
  status: VoucherStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feeVoucherSchema = new Schema<IFeeVoucher>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    items: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue', 'waived'],
      default: 'unpaid',
    },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Running monthly generation twice can't create duplicates
feeVoucherSchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });
feeVoucherSchema.index({ status: 1 });

export const FeeVoucher = mongoose.model<IFeeVoucher>('FeeVoucher', feeVoucherSchema);
