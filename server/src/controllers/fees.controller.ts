import { Response } from 'express';
import { FeeStructure } from '../models/FeeStructure';
import { FeeVoucher } from '../models/FeeVoucher';
import { Payment } from '../models/Payment';
import { Enrollment } from '../models/Enrollment';
import { Student } from '../models/Student';
import { ApiError, ApiResponse, asyncHandler, paginate } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

// ─── Fee Structures ─────────────────────────────────────────────────────────

export const getFeeStructures = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, academicYearId } = req.query;
  const filter: any = {};
  if (classId) filter.classId = classId;
  if (academicYearId) filter.academicYearId = academicYearId;

  const structures = await FeeStructure.find(filter)
    .populate('classId', 'name')
    .populate('academicYearId', 'name');
  res.json(new ApiResponse(200, structures));
});

export const createFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const structure = await FeeStructure.create(req.body);
  res.status(201).json(new ApiResponse(201, structure, 'Fee structure created'));
});

export const updateFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const structure = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!structure) throw new ApiError(404, 'Fee structure not found');
  res.json(new ApiResponse(200, structure));
});

// ─── Fee Vouchers ────────────────────────────────────────────────────────────

export const getVouchers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, studentId, status, month, year } = req.query;
  const { skip, limit: lim, page: pg } = paginate(Number(page), Number(limit));

  const filter: any = {};
  if (studentId) filter.studentId = studentId;
  if (status) filter.status = status;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  const [vouchers, total] = await Promise.all([
    FeeVoucher.find(filter)
      .populate('studentId', 'userId admissionNo')
      .skip(skip)
      .limit(lim)
      .sort({ year: -1, month: -1 }),
    FeeVoucher.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { vouchers, total, page: pg, limit: lim, pages: Math.ceil(total / lim) }));
});

export const getVoucher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const voucher = await FeeVoucher.findById(req.params.id)
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } });
  if (!voucher) throw new ApiError(404, 'Voucher not found');
  res.json(new ApiResponse(200, voucher));
});

export const generateMonthlyVouchers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year, academicYearId } = req.body;
  if (!month || !year || !academicYearId) {
    throw new ApiError(400, 'month, year, and academicYearId are required');
  }

  const dueDate = new Date(year, month - 1, 10); // Due on 10th of month

  // Get all active enrollments for this academic year
  const enrollments = await Enrollment.find({ academicYearId, status: 'active' })
    .populate({ path: 'sectionId', populate: { path: 'classId' } });

  let created = 0;
  let skipped = 0;

  for (const enrollment of enrollments) {
    const section = enrollment.sectionId as any;
    const classId = section?.classId?._id;
    if (!classId) continue;

    const feeStructure = await FeeStructure.findOne({ classId, academicYearId });
    if (!feeStructure) continue;

    try {
      await FeeVoucher.create({
        studentId: enrollment.studentId,
        month: Number(month),
        year: Number(year),
        items: feeStructure.items,
        total: feeStructure.total,
        paid: 0,
        status: 'unpaid',
        dueDate,
      });
      created++;
    } catch (err: any) {
      if (err.code === 11000) skipped++; // Already exists
      else throw err;
    }
  }

  res.json(new ApiResponse(200, { created, skipped }, `Generated ${created} vouchers, ${skipped} already existed`));
});

export const recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { voucherId, amount, method, transactionId, notes } = req.body;
  if (!voucherId || !amount || !method) throw new ApiError(400, 'voucherId, amount, method required');

  const voucher = await FeeVoucher.findById(voucherId);
  if (!voucher) throw new ApiError(404, 'Voucher not found');

  const outstanding = voucher.total - voucher.discount - voucher.paid;
  if (amount > outstanding) throw new ApiError(400, `Amount exceeds outstanding balance of ${outstanding}`);

  const payment = await Payment.create({
    voucherId,
    amount: Number(amount),
    method,
    transactionId,
    notes,
    receivedBy: req.user!._id,
    date: new Date(),
  });

  voucher.paid += Number(amount);
  if (voucher.paid >= voucher.total - voucher.discount) {
    voucher.status = 'paid';
  } else {
    voucher.status = 'partial';
  }
  await voucher.save();

  res.json(new ApiResponse(201, { payment, voucher }, 'Payment recorded'));
});

export const getDefaulters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query;
  const filter: any = { status: { $in: ['unpaid', 'overdue', 'partial'] } };
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  const vouchers = await FeeVoucher.find(filter)
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
    .sort({ total: -1 });

  res.json(new ApiResponse(200, vouchers));
});

export const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { voucherId } = req.query;
  const filter: any = {};
  if (voucherId) filter.voucherId = voucherId;

  const payments = await Payment.find(filter)
    .populate('receivedBy', 'name')
    .sort({ date: -1 });

  res.json(new ApiResponse(200, payments));
});
