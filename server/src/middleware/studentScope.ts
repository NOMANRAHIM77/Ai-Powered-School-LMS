import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Student } from '../models/Student';
import { AuthRequest } from './auth';
import { ApiError } from '../utils/apiHelpers';

export interface StudentRequest extends AuthRequest {
  allowedStudentIds?: Types.ObjectId[];
  schoolId?: Types.ObjectId;
}

// Centralized scope can later be extended to include guardian-linked children.
export async function resolveStudentScope(req: StudentRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'student') throw new ApiError(403, 'Student access required');
    const student = await Student.findOne({ userId: req.user._id, status: 'active' }).select('_id schoolId');
    if (!student) throw new ApiError(404, 'Active student profile not found');
    req.allowedStudentIds = [student._id as Types.ObjectId];
    req.schoolId = student.schoolId;
    next();
  } catch (error) { next(error); }
}
