import { Router } from 'express';
import { markAttendance, getAttendance, getMonthlyReport, getStudentAttendance } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', authorize('admin', 'teacher'), markAttendance);
router.get('/', authorize('admin', 'teacher'), getAttendance);
router.get('/monthly-report', authorize('admin', 'teacher'), getMonthlyReport);
router.get('/student/:studentId', authorize('admin', 'teacher'), getStudentAttendance);

export default router;
