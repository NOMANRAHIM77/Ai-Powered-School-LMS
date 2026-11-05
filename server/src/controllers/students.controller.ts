import { encodeStudentPhoto } from '../middleware/studentPhoto';
import { Response } from 'express';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { ApiError, ApiResponse, asyncHandler, paginate } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, search, status, sectionId, classId } = req.query;
  const { skip, limit: lim, page: pg } = paginate(Number(page), Number(limit));

  const userFilter: any = { role: 'student' };
  if (search) {
    userFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(userFilter).select('_id');
  const userIds = users.map(u => u._id);

  const studentFilter: any = { userId: { $in: userIds } };
  if (status) studentFilter.status = status;

  const [students, total] = await Promise.all([
    Student.find(studentFilter)
      .populate('userId', 'name email isActive')
      .populate('guardianIds', 'name email')
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Student.countDocuments(studentFilter),
  ]);

  res.json(new ApiResponse(200, { students, total, page: pg, limit: lim, pages: Math.ceil(total / lim) }));
});

export const getStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findById(req.params.id)
    .populate('userId', 'name email isActive role')
    .populate('guardianIds', 'name email');
  if (!student) throw new ApiError(404, 'Student not found');
  res.json(new ApiResponse(200, student));
});

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, dob, gender, admissionNo, bloodGroup, phone, address } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name, email, passwordHash: password || 'student@123', role: 'student'
  });

  const student = await Student.create({
    userId: user._id,
    admissionNo,
    dob,
    gender,
    bloodGroup,
    phone,
    address,
    photo: await encodeStudentPhoto(req.file),
  });

  res.status(201).json(new ApiResponse(201, { user, student }, 'Student created successfully'));
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  const { name, email, isActive, ...studentFields } = req.body;

  if (name || email !== undefined || isActive !== undefined) {
    await User.findByIdAndUpdate(student.userId, { name, email, isActive });
  }

  if (req.file) studentFields.photo = await encodeStudentPhoto(req.file);

  Object.assign(student, studentFields);
  await student.save();

  res.json(new ApiResponse(200, student, 'Student updated'));
});

export const deleteStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  await User.findByIdAndUpdate(student.userId, { isActive: false });
  student.status = 'withdrawn';
  await student.save();

  res.json(new ApiResponse(200, null, 'Student deactivated'));
});

export const bulkImportStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new ApiError(400, 'CSV file is required');

  const fileContent = fs.readFileSync(req.file.path, 'utf-8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of records) {
    try {
      const existing = await User.findOne({ email: row.email?.toLowerCase() });
      if (existing) { results.skipped++; continue; }

      const user = await User.create({
        name: row.name,
        email: row.email.toLowerCase(),
        passwordHash: row.password || 'student@123',
        role: 'student',
      });

      await Student.create({
        userId: user._id,
        admissionNo: row.admissionNo || `ADM-${Date.now()}`,
        dob: new Date(row.dob),
        gender: row.gender || 'male',
        phone: row.phone,
        address: row.address,
      });

      results.created++;
    } catch (err: any) {
      results.errors.push(`Row ${row.name}: ${err.message}`);
    }
  }

  fs.unlinkSync(req.file.path);
  res.json(new ApiResponse(200, results, `Import complete: ${results.created} created, ${results.skipped} skipped`));
});

export const linkParent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { parentId } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  if (!student.guardianIds.includes(parentId)) {
    student.guardianIds.push(parentId);
    await student.save();
  }

  res.json(new ApiResponse(200, student, 'Parent linked'));
});
