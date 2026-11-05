import { Router } from 'express';
import {
  getAcademicYears, getCurrentAcademicYear, createAcademicYear, updateAcademicYear, deleteAcademicYear,
  getClasses, createClass, updateClass, deleteClass,
  getSections, createSection, updateSection, deleteSection,
  getSubjects, createSubject, updateSubject, deleteSubject,
} from '../controllers/academic.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Academic Years
router.get('/current-year', getCurrentAcademicYear);
router.get('/years', authorize('admin', 'teacher'), getAcademicYears);
router.post('/years', authorize('admin'), createAcademicYear);
router.put('/years/:id', authorize('admin'), updateAcademicYear);
router.delete('/years/:id', authorize('admin'), deleteAcademicYear);

// Classes
router.get('/classes', authorize('admin', 'teacher'), getClasses);
router.post('/classes', authorize('admin'), createClass);
router.put('/classes/:id', authorize('admin'), updateClass);
router.delete('/classes/:id', authorize('admin'), deleteClass);

// Sections
router.get('/sections', authorize('admin', 'teacher'), getSections);
router.post('/sections', authorize('admin'), createSection);
router.put('/sections/:id', authorize('admin'), updateSection);
router.delete('/sections/:id', authorize('admin'), deleteSection);

// Subjects
router.get('/subjects', authorize('admin', 'teacher'), getSubjects);
router.post('/subjects', authorize('admin'), createSubject);
router.put('/subjects/:id', authorize('admin'), updateSubject);
router.delete('/subjects/:id', authorize('admin'), deleteSubject);

export default router;
