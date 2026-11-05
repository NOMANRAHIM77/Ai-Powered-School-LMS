import { Router } from 'express';
import { getExams, getExam, createExam, updateExam, deleteExam, publishExam, saveResults, getResults, getGradingScale } from '../controllers/exams.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), getExams);
router.get('/grading-scale', getGradingScale);
router.get('/results', authorize('admin', 'teacher'), getResults);
router.get('/:id', authorize('admin', 'teacher'), getExam);
router.post('/', authorize('admin'), createExam);
router.put('/:id', authorize('admin'), updateExam);
router.delete('/:id', authorize('admin'), deleteExam);
router.patch('/:id/publish', authorize('admin'), publishExam);
router.post('/results', authorize('admin', 'teacher'), saveResults);

export default router;
