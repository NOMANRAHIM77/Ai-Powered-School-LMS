import { encodeStudentPhoto } from '../middleware/studentPhoto';
import { Response } from 'express';
import { User } from '../models/User';
import { Teacher } from '../models/Teacher';
import { ApiError, ApiResponse, asyncHandler, paginate } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getTeachers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, search } = req.query;
  const { skip, limit: lim, page: pg } = paginate(Number(page), Number(limit));

  const userFilter: any = { role: 'teacher' };
  if (search) {
    userFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(userFilter).select('_id');
  const userIds = users.map(u => u._id);

  const [teachers, total] = await Promise.all([
    Teacher.find({ userId: { $in: userIds } })
      .populate('userId', 'name email isActive')
      .populate('subjects', 'name code')
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Teacher.countDocuments({ userId: { $in: userIds } }),
  ]);

  res.json(new ApiResponse(200, { teachers, total, page: pg, limit: lim, pages: Math.ceil(total / lim) }));
});

export const getTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate('userId', 'name email isActive')
    .populate('subjects', 'name code classId');
  if (!teacher) throw new ApiError(404, 'Teacher not found');
  res.json(new ApiResponse(200, teacher));
});

export const createTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, employeeId, phone, address, qualification, joinDate } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(409, 'Email already registered');

  const existingTeacher = await Teacher.findOne({ employeeId });
  if (existingTeacher) throw new ApiError(409, 'Employee ID already exists');

  const user = await User.create({
    name, email, passwordHash: password || 'teacher@123', role: 'teacher'
  });

  const teacher = await Teacher.create({
    userId: user._id,
    employeeId,
    phone,
    address,
    qualification,
    joinDate,
    photo: await encodeStudentPhoto(req.file),
  });

  res.status(201).json(new ApiResponse(201, { user, teacher }, 'Teacher created'));
});

export const updateTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw new ApiError(404, 'Teacher not found');

  const { name, email, isActive, ...teacherFields } = req.body;
  if (name || email !== undefined || isActive !== undefined) {
    await User.findByIdAndUpdate(teacher.userId, { name, email, isActive });
  }

  if (req.file) teacherFields.photo = await encodeStudentPhoto(req.file);
  Object.assign(teacher, teacherFields);
  await teacher.save();

  res.json(new ApiResponse(200, teacher, 'Teacher updated'));
});

export const deleteTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw new ApiError(404, 'Teacher not found');
  await User.findByIdAndUpdate(teacher.userId, { isActive: false });
  res.json(new ApiResponse(200, null, 'Teacher deactivated'));
});
