import { Response } from 'express';
import { AcademicYear } from '../models/AcademicYear';
import { Class } from '../models/Class';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

// ─── Academic Years ────────────────────────────────────────────────
export const getAcademicYears = asyncHandler(async (req: AuthRequest, res: Response) => {
  const years = await AcademicYear.find().sort({ startDate: -1 });
  res.json(new ApiResponse(200, years));
});

export const getCurrentAcademicYear = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const year = await AcademicYear.findOne({ isCurrent: true }).select('_id name startDate endDate');
  res.json(new ApiResponse(200, year));
});

export const createAcademicYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, startDate, endDate, isCurrent } = req.body;
  const year = await AcademicYear.create({ name, startDate, endDate, isCurrent });
  res.status(201).json(new ApiResponse(201, year, 'Academic year created'));
});

export const updateAcademicYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!year) throw new ApiError(404, 'Academic year not found');
  res.json(new ApiResponse(200, year));
});

export const deleteAcademicYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = await AcademicYear.findByIdAndDelete(req.params.id);
  if (!year) throw new ApiError(404, 'Academic year not found');
  res.json(new ApiResponse(200, null, 'Academic year deleted'));
});

// ─── Classes ───────────────────────────────────────────────────────
export const getClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { academicYearId } = req.query;
  const filter = academicYearId ? { academicYearId } : {};
  const classes = await Class.find(filter).populate('academicYearId', 'name').sort({ displayOrder: 1, name: 1 });
  res.json(new ApiResponse(200, classes));
});

export const createClass = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cls = await Class.create(req.body);
  res.status(201).json(new ApiResponse(201, cls, 'Class created'));
});

export const updateClass = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cls) throw new ApiError(404, 'Class not found');
  res.json(new ApiResponse(200, cls));
});

export const deleteClass = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cls = await Class.findByIdAndDelete(req.params.id);
  if (!cls) throw new ApiError(404, 'Class not found');
  res.json(new ApiResponse(200, null, 'Class deleted'));
});

// ─── Sections ──────────────────────────────────────────────────────
export const getSections = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.query;
  const filter = classId ? { classId } : {};
  const sections = await Section.find(filter)
    .populate('classId', 'name')
    .populate('classTeacherId', 'userId')
    .sort({ name: 1 });
  res.json(new ApiResponse(200, sections));
});

export const createSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const section = await Section.create(req.body);
  res.status(201).json(new ApiResponse(201, section, 'Section created'));
});

export const updateSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!section) throw new ApiError(404, 'Section not found');
  res.json(new ApiResponse(200, section));
});

export const deleteSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const section = await Section.findByIdAndDelete(req.params.id);
  if (!section) throw new ApiError(404, 'Section not found');
  res.json(new ApiResponse(200, null, 'Section deleted'));
});

// ─── Subjects ──────────────────────────────────────────────────────
export const getSubjects = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.query;
  const filter = classId ? { classId } : {};
  const subjects = await Subject.find(filter)
    .populate('classId', 'name')
    .populate('teacherId', 'userId')
    .sort({ name: 1 });
  res.json(new ApiResponse(200, subjects));
});

export const createSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.create(req.body);
  res.status(201).json(new ApiResponse(201, subject, 'Subject created'));
});

export const updateSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!subject) throw new ApiError(404, 'Subject not found');
  res.json(new ApiResponse(200, subject));
});

export const deleteSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) throw new ApiError(404, 'Subject not found');
  res.json(new ApiResponse(200, null, 'Subject deleted'));
});
