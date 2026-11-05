import { Response } from 'express';
import { Attendance } from '../models/Attendance';
import { Enrollment } from '../models/Enrollment';
import { Student } from '../models/Student';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const markAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, date, records } = req.body;

  if (!sectionId || !date || !records?.length) {
    throw new ApiError(400, 'sectionId, date, and records are required');
  }

  const attendance = await Attendance.findOneAndUpdate(
    { sectionId, date: new Date(date) },
    {
      sectionId,
      date: new Date(date),
      records,
      markedBy: req.user!._id,
    },
    { upsert: true, new: true }
  );

  res.json(new ApiResponse(200, attendance, 'Attendance saved'));
});

export const getAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, date } = req.query;
  if (!sectionId || !date) throw new ApiError(400, 'sectionId and date required');

  const attendance = await Attendance.findOne({ sectionId, date: new Date(date as string) })
    .populate('records.studentId', 'userId admissionNo photo')
    .populate('markedBy', 'name');

  res.json(new ApiResponse(200, attendance));
});

export const getMonthlyReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, month, year } = req.query;
  if (!sectionId || !month || !year) throw new ApiError(400, 'sectionId, month, year required');

  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0);

  const records = await Attendance.find({
    sectionId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  // Build per-student summary
  const studentMap = new Map<
    string,
    { present: number; absent: number; late: number; leave: number; total: number }
  >();

  for (const rec of records) {
    for (const r of rec.records) {
      const id = r.studentId.toString();
      if (!studentMap.has(id)) {
        studentMap.set(id, { present: 0, absent: 0, late: 0, leave: 0, total: 0 });
      }
      const s = studentMap.get(id)!;
      s.total++;
      if (r.status === 'present') s.present++;
      else if (r.status === 'absent') s.absent++;
      else if (r.status === 'late') s.late++;
      else if (r.status === 'leave') s.leave++;
    }
  }

  const summary = Array.from(studentMap.entries()).map(([studentId, stats]) => ({
    studentId,
    ...stats,
    percentage: stats.total ? Math.round((stats.present / stats.total) * 100) : 0,
  }));

  // Flag low attendance (< 75%)
  const lowAttendance = summary.filter(s => s.percentage < 75);

  res.json(new ApiResponse(200, { records, summary, lowAttendance, workingDays: records.length }));
});

export const getStudentAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const { month, year, sectionId } = req.query;

  const filter: any = { 'records.studentId': studentId };
  if (sectionId) filter.sectionId = sectionId;
  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);
    filter.date = { $gte: startDate, $lte: endDate };
  }

  const attendanceRecords = await Attendance.find(filter).sort({ date: 1 });

  const stats = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
  const daily: Array<{ date: Date; status: string }> = [];

  for (const rec of attendanceRecords) {
    const studentRecord = rec.records.find(r => r.studentId.toString() === studentId);
    if (studentRecord) {
      stats.total++;
      const status = studentRecord.status;
      if (status === 'present') stats.present++;
      else if (status === 'absent') stats.absent++;
      else if (status === 'late') stats.late++;
      else if (status === 'leave') stats.leave++;
      daily.push({ date: rec.date, status });
    }
  }

  res.json(
    new ApiResponse(200, {
      stats,
      daily,
      percentage: stats.total ? Math.round((stats.present / stats.total) * 100) : 0,
    })
  );
});
