import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFeeItem {
  title: string;
  amount: number;
}

export interface IFeeStructure extends Document {
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  items: IFeeItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    items: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

feeStructureSchema.pre('save', function (next) {
  this.total = this.items.reduce((sum, item) => sum + item.amount, 0);
  next();
});

feeStructureSchema.index({ classId: 1, academicYearId: 1 }, { unique: true });

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);
