import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { chatContacts, requireContact } from '../services/familyChat';
import { FamilyMessage } from '../models/FamilyMessage';
import { z } from 'zod';
const router = Router();
router.use(authenticate, authorize('parent', 'teacher'));
router.get('/contacts', asyncHandler(async (req: any, res: Response) => res.json(new ApiResponse(200, await chatContacts(req.user)))));
router.get('/messages', asyncHandler(async (req: any, res: Response) => {
  const contact = await requireContact(req.user, String(req.query.conversation));
  const before = req.query.before ? z.string().regex(/^[a-f\d]{24}$/i).parse(req.query.before) : undefined;
  const messages = await FamilyMessage.find({ conversation: contact.key, ...(before ? { _id: { $lt: before } } : {}) }).sort({ _id: -1 }).limit(200).lean();
  res.json(new ApiResponse(200, messages.reverse()));
}));
export default router;

