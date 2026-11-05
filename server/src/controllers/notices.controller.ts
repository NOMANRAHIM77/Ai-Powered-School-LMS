import { Response } from 'express';
import { Notice } from '../models/Notice';
import { ApiError, ApiResponse, asyncHandler, paginate } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getNotices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, audience, classId } = req.query;
  const { skip, limit: lim, page: pg } = paginate(Number(page), Number(limit));

  const filter: any = { isActive: true };

  // Role-based filtering
  const role = req.user?.role;
  if (role === 'student') filter.audience = { $in: ['all', 'student'] };
  else if (role === 'parent') filter.audience = { $in: ['all', 'parent'] };
  else if (role === 'teacher') filter.audience = { $in: ['all', 'teacher'] };

  if (audience) filter.audience = audience;
  if (classId) filter.classIds = classId;

  const [notices, total] = await Promise.all([
    Notice.find(filter)
      .populate('createdBy', 'name role')
      .skip(skip)
      .limit(lim)
      .sort({ isPinned: -1, createdAt: -1 }),
    Notice.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { notices, total, page: pg, limit: lim, pages: Math.ceil(total / lim) }));
});

export const getNotice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notice = await Notice.findById(req.params.id).populate('createdBy', 'name role');
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.json(new ApiResponse(200, notice));
});

export const createNotice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notice = await Notice.create({ ...req.body, createdBy: req.user!._id });
  res.status(201).json(new ApiResponse(201, notice, 'Notice posted'));
});

export const updateNotice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.json(new ApiResponse(200, notice));
});

export const deleteNotice = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, null, 'Notice deleted'));
});
