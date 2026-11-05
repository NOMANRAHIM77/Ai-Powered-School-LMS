import { studentPhotoUpload } from '../middleware/studentPhoto';
import { Router } from 'express';
import { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } from '../controllers/teachers.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), getTeachers);
router.get('/:id', authorize('admin', 'teacher'), getTeacher);
router.post('/', authorize('admin'), studentPhotoUpload, createTeacher);
router.put('/:id', authorize('admin'), studentPhotoUpload, updateTeacher);
router.delete('/:id', authorize('admin'), deleteTeacher);

export default router;
