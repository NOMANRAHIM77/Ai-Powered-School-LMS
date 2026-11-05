import { Router } from 'express';
import { getAdminDashboard, getParentDashboard, getStudentDashboard, getTeacherDashboard } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/teacher', authorize('teacher', 'admin'), getTeacherDashboard);
router.get('/student', authorize('student'), getStudentDashboard);
router.get('/parent', authorize('parent', 'admin'), getParentDashboard);

export default router;
