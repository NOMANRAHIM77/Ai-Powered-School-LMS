import { studentPhotoUpload } from '../middleware/studentPhoto';
import { Router } from 'express';
import {
  getStudents, getStudent, createStudent, updateStudent, deleteStudent,
  bulkImportStudents, linkParent,
} from '../controllers/students.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadPhoto, uploadCsv } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), getStudents);
router.get('/:id', authorize('admin', 'teacher'), getStudent);
router.post('/', authorize('admin'), studentPhotoUpload, createStudent);
router.put('/:id', authorize('admin'), studentPhotoUpload, updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);
router.post('/bulk-import', authorize('admin'), uploadCsv.single('csv'), bulkImportStudents);
router.post('/:id/link-parent', authorize('admin'), linkParent);

export default router;
