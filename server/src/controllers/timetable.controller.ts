import { Response } from 'express';
import { Timetable } from '../models/Timetable';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getTimetable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, academicYearId, day, teacherId } = req.query;
  const filter: Record<string, unknown> = {};
  if (sectionId) filter.sectionId = sectionId;
  if (academicYearId) filter.academicYearId = academicYearId;
  if (day) filter.day = day;
  if (teacherId) filter['periods.teacherId'] = teacherId;

  const entries = await Timetable.find(filter)
    .populate({ path: 'sectionId', populate: { path: 'classId', select: 'name' } })
    .populate('periods.subjectId', 'name code colorIndex')
    .populate({ path: 'periods.teacherId', populate: { path: 'userId', select: 'name' } })
    .sort({ day: 1 });
  res.json(new ApiResponse(200, entries));
});

export const upsertTimetable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, academicYearId, day, periods } = req.body;
  if (!sectionId || !academicYearId || !day || !Array.isArray(periods)) {
    throw new ApiError(400, 'sectionId, academicYearId, day, and periods are required');
  }

  const entry = await Timetable.findOneAndUpdate(
    { sectionId, academicYearId, day },
    { sectionId, academicYearId, day, periods },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(201).json(new ApiResponse(201, entry, 'Timetable saved'));
});

export const deleteTimetable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const entry = await Timetable.findByIdAndDelete(req.params.id);
  if (!entry) throw new ApiError(404, 'Timetable entry not found');
  res.json(new ApiResponse(200, null, 'Timetable entry deleted'));
});
