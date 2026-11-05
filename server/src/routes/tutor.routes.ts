import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { courseScope, parse } from './courseLearning.routes';
import { TutorSource } from '../models/TutorContent';
import { CourseActivity } from '../models/CourseActivity';
import { ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { askTutor, indexMaterial, EMBEDDING_MODEL } from '../services/courseTutor';
import { env } from '../config/env';
const router=Router();router.use(authenticate,authorize('student','teacher'));
router.get('/:courseId/status',asyncHandler(async(req:AuthRequest,res:Response)=>{const {course}=await courseScope(req,req.params.courseId);const materials=await CourseActivity.find({courseId:course._id,kind:'material'}).select('title').lean();const statuses=await TutorSource.find({courseId:course._id}).select('activityId status warning chunks embeddingModel').lean();res.json(new ApiResponse(200,{configured:!!env.GROQ_API_KEY,items:materials.map(m=>{const source=statuses.find(s=>String(s.activityId)===String(m._id));const outdated=source?.status==='ready'&&source.embeddingModel!==EMBEDDING_MODEL;return {...m,...source,_id:m._id,...(outdated?{status:'pending',chunks:0,warning:'Prepare this material again for the updated tutor.'}:{})};})}));}));
router.post('/:courseId/index/:activityId',authorize('teacher'),rateLimit({windowMs:60000,limit:6}),asyncHandler(async(req:AuthRequest,res:Response)=>{await courseScope(req,req.params.courseId);parse(z.string().regex(/^[a-f\d]{24}$/i),req.params.activityId);res.json(new ApiResponse(200,await indexMaterial(req.params.activityId,req.params.courseId)));}));
router.post('/:courseId/ask',authorize('student'),rateLimit({windowMs:60000,limit:12,keyGenerator:(req:any)=>req.user._id}),asyncHandler(async(req:AuthRequest,res:Response)=>{await courseScope(req,req.params.courseId);const {question}=parse(z.object({question:z.string().trim().min(3).max(2000)}).strict(),req.body);const answer=await askTutor(req.params.courseId,question);await courseScope(req,req.params.courseId);res.json(new ApiResponse(200,answer));}));
export default router;

