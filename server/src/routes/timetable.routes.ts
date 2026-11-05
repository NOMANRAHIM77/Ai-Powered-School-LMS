import { Router } from 'express';
import { deleteTimetable, getTimetable, upsertTimetable } from '../controllers/timetable.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', authorize('admin', 'teacher'), getTimetable);
router.post('/', authorize('admin'), upsertTimetable);
router.delete('/:id', authorize('admin'), deleteTimetable);

export default router;
