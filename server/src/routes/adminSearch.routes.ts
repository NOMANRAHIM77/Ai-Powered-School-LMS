import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { interpretSearch, searchTarget } from '../services/adminSearch';
const router = Router();
router.use(authenticate, authorize('admin'));
router.post('/interpret', rateLimit({ windowMs: 60000, limit: 10, keyGenerator: (req: any) => String(req.user._id) }), asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = z.object({ target: searchTarget, query: z.string().trim().min(2).max(600) }).strict().safeParse(req.body);
  if (!input.success) throw new ApiError(400, 'Enter a search of 2–600 characters and choose a supported list.');
  res.json(new ApiResponse(200, await interpretSearch(input.data.target, input.data.query)));
}));
export default router;
