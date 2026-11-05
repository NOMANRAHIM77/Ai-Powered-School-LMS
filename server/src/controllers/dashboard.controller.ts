import { Response } from 'express';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { Attendance } from '../models/Attendance';
import { FeeVoucher } from '../models/FeeVoucher';
import { Payment } from '../models/Payment';
import { Notice } from '../models/Notice';
import { Timetable } from '../models/Timetable';
import { Result } from '../models/Result';
import { Exam } from '../models/Exam';
import { ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getAdminDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalStudents, activeStudents, totalTeachers] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ status: 'active' }),
    User.countDocuments({ role: 'teacher', isActive: true }),
  ]);

  // Today's attendance
  const todayAttendance = await Attendance.find({ date: today });
  let totalPresent = 0;
  let totalStudentsMarked = 0;
  for (const rec of todayAttendance) {
    for (const r of rec.records) {
      totalStudentsMarked++;
      if (r.status === 'present' || r.status === 'late') totalPresent++;
    }
  }
  const attendancePercent = totalStudentsMarked > 0
    ? Math.round((totalPresent / totalStudentsMarked) * 100)
    : 0;

  // Fees this month
  const [feesCollected, feesOutstanding] = await Promise.all([
    Payment.aggregate([
      { $match: { date: { $gte: new Date(currentYear, currentMonth - 1, 1) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    FeeVoucher.aggregate([
      { $match: { month: currentMonth, year: currentYear, status: { $in: ['unpaid', 'overdue', 'partial'] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$paid'] } } } },
    ]),
  ]);

  // Monthly fee collection (last 6 months)
  const feeChart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const end = new Date(currentYear, currentMonth - 1 - i + 1, 0);
    const agg = await Payment.aggregate([
      { $match: { date: { $gte: d, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    feeChart.push({
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      total: agg[0]?.total || 0,
    });
  }

  // Recent notices
  const recentNotices = await Notice.find({ isActive: true })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  // Defaulters
  const defaulters = await FeeVoucher.find({ month: currentMonth, year: currentYear, status: { $in: ['unpaid', 'overdue'] } })
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
    .limit(10);

  res.json(new ApiResponse(200, {
    stats: {
      totalStudents,
      activeStudents,
      totalTeachers,
      attendancePercent,
      feesCollected: feesCollected[0]?.total || 0,
      feesOutstanding: feesOutstanding[0]?.total || 0,
    },
    feeChart,
    recentNotices,
    defaulters,
  }));
});

export const getTeacherDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Get teacher's sections by looking up their timetable entries
  const timetableToday = await Timetable.find({ 'periods.teacherId': req.user!._id, day: dayName })
    .populate('sectionId', 'name classId')
    .populate('periods.subjectId', 'name colorIndex');

  // Sections where attendance not yet marked today
  const markedSections = await Attendance.find({ date: today }).distinct('sectionId');

  const notices = await Notice.find({ isActive: true, audience: { $in: ['all', 'teacher'] } })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(5);

  res.json(new ApiResponse(200, { timetableToday, markedSections, notices }));
});

export const getStudentDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const student = await Student.findOne({ userId: req.user!._id });
  if (!student) {
    return res.status(404).json(new ApiResponse(404, null, 'Student profile not found'));
  }

  // Active enrollment
  const enrollment = await Enrollment.findOne({ studentId: student._id, status: 'active' })
    .populate({ path: 'sectionId', populate: { path: 'classId', select: 'name' } });

  // Attendance this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const attendanceRecords = await Attendance.find({
    'records.studentId': student._id,
    date: { $gte: monthStart },
  });

  let present = 0;
  let total = 0;
  for (const rec of attendanceRecords) {
    const r = rec.records.find(r => r.studentId.toString() === student._id.toString());
    if (r) { total++; if (r.status === 'present') present++; }
  }

  // Latest results
  const publishedExamIds = await Exam.find({ isPublished: true }).distinct('_id');
  const latestResults = await Result.find({ studentId: student._id, examId: { $in: publishedExamIds } })
    .populate({ path: 'examId', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(3);

  // Fee status
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const feeVoucher = await FeeVoucher.findOne({ studentId: student._id, month: currentMonth, year: currentYear });

  // Timetable today
  const timetable = enrollment
    ? await Timetable.find({ sectionId: (enrollment.sectionId as any)._id, day: dayName })
        .populate('periods.subjectId', 'name colorIndex')
    : [];

  // Notices
  const classId = (enrollment?.sectionId as any)?.classId?._id;
  const notices = await Notice.find({ isActive: true, audience: { $in: ['all', 'student'] }, $and: [{ $or: [{ classIds: { $exists: false } }, { classIds: { $size: 0 } }, ...(classId ? [{ classIds: classId }] : [])] }, { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] }] })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(5);

  res.json(new ApiResponse(200, {
    student,
    enrollment,
    attendance: { present, total, percentage: total ? Math.round((present / total) * 100) : 0 },
    latestResults,
    feeVoucher,
    timetable,
    notices,
  }));
});

export const getParentDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const children = await Student.find({ guardianIds: req.user!._id })
    .populate('userId', 'name email');
  
  res.json(new ApiResponse(200, { children }));
});
