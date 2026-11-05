import { Router } from 'express';
import {
  getFeeStructures, createFeeStructure, updateFeeStructure,
  getVouchers, getVoucher, generateMonthlyVouchers, recordPayment,
  getDefaulters, getPayments,
} from '../controllers/fees.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Fee structures
router.get('/structures', authorize('admin'), getFeeStructures);
router.post('/structures', authorize('admin'), createFeeStructure);
router.put('/structures/:id', authorize('admin'), updateFeeStructure);

// Vouchers
router.get('/vouchers', authorize('admin'), getVouchers);
router.get('/vouchers/:id', authorize('admin'), getVoucher);
router.post('/vouchers/generate', authorize('admin'), generateMonthlyVouchers);
router.get('/defaulters', authorize('admin'), getDefaulters);

// Payments
router.post('/payments', authorize('admin'), recordPayment);
router.get('/payments', authorize('admin'), getPayments);

export default router;
