import { Router } from 'express';
import { createNotice, deleteNotice, getNotice, getNotices, updateNotice } from '../controllers/notices.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', authorize('admin', 'teacher', 'parent'), getNotices);
router.get('/:id', authorize('admin', 'teacher'), getNotice);
router.post('/', authorize('admin', 'teacher'), createNotice);
router.put('/:id', authorize('admin', 'teacher'), updateNotice);
router.delete('/:id', authorize('admin'), deleteNotice);

export default router;
