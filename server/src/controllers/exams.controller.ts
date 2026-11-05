import { Response } from 'express';
import { Exam } from '../models/Exam';
import { Result } from '../models/Result';
import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { ApiError, ApiResponse, asyncHandler, paginate } from '../utils/apiHelpers';
import { getGrade, getPercentage, GRADING_SCALE } from '../services/grading';
import { AuthRequest } from '../middleware/auth';

export const getExams = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, academicYearId } = req.query;
  const filter: any = {};
  if (classId) filter.classId = classId;
  if (academicYearId) filter.academicYearId = academicYearId;

  const exams = await Exam.find(filter)
    .populate('classId', 'name')
    .populate('academicYearId', 'name')
    .populate('subjects.subjectId', 'name code')
    .sort({ startDate: -1 });
  res.json(new ApiResponse(200, exams));
});

export const getExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exam = await Exam.findById(req.params.id)
    .populate('classId', 'name')
    .populate('subjects.subjectId', 'name code');
  if (!exam) throw new ApiError(404, 'Exam not found');
  res.json(new ApiResponse(200, exam));
});

export const createExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exam = await Exam.create({ ...req.body, createdBy: req.user!._id });
  res.status(201).json(new ApiResponse(201, exam, 'Exam created'));
});

export const updateExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!exam) throw new ApiError(404, 'Exam not found');
  res.json(new ApiResponse(200, exam));
});

export const deleteExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Exam.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, null, 'Exam deleted'));
});

export const publishExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exam = await Exam.findByIdAndUpdate(req.params.id, { isPublished: true }, { new: true });
  if (!exam) throw new ApiError(404, 'Exam not found');
  res.json(new ApiResponse(200, exam, 'Exam published'));
});

export const saveResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { examId, results } = req.body;
  if (!examId || !results?.length) throw new ApiError(400, 'examId and results required');

  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError(404, 'Exam not found');

  const savedResults = [];

  for (const r of results) {
    const { studentId, marks } = r;

    // Calculate totals
    let totalObtained = 0;
    let totalMarks = 0;
    let allPassed = true;

    const enrichedMarks = marks.map((m: any) => {
      const examSubject = exam.subjects.find(s => s.subjectId.toString() === m.subjectId);
      if (!examSubject) return m;

      totalObtained += Number(m.obtained);
      totalMarks += examSubject.totalMarks;

      if (Number(m.obtained) < examSubject.passingMarks) allPassed = false;

      return {
        ...m,
        grade: getGrade(m.obtained, examSubject.totalMarks),
      };
    });

    const percentage = getPercentage(totalObtained, totalMarks);
    const overallGrade = getGrade(totalObtained, totalMarks);

    const result = await Result.findOneAndUpdate(
      { examId, studentId },
      {
        examId,
        studentId,
        marks: enrichedMarks,
        totalObtained,
        totalMarks,
        percentage,
        grade: overallGrade,
        isPassed: allPassed,
      },
      { upsert: true, new: true }
    );

    savedResults.push(result);
  }

  // Calculate positions
  const allResults = await Result.find({ examId }).sort({ percentage: -1 });
  for (let i = 0; i < allResults.length; i++) {
    allResults[i].position = i + 1;
    await allResults[i].save();
  }

  res.json(new ApiResponse(200, savedResults, 'Results saved'));
});

export const getResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { examId, studentId, sectionId } = req.query;
  const filter: any = {};
  if (examId) filter.examId = examId;
  if (studentId) filter.studentId = studentId;

  const results = await Result.find(filter)
    .populate('studentId', 'userId admissionNo')
    .populate('marks.subjectId', 'name code')
    .sort({ position: 1 });

  res.json(new ApiResponse(200, results));
});

export const getGradingScale = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(new ApiResponse(200, GRADING_SCALE));
});
