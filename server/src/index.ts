import tutorRoutes from './routes/tutor.routes';
import adminSearchRoutes from './routes/adminSearch.routes';
import personalizedQuizRoutes from './routes/personalizedQuiz.routes';
import { startPracticeWorker } from './services/personalizedQuiz';
import { startAssignedQuizWorker } from './services/assignedQuizGrading';
import fs from 'fs';
import { uploadPath } from './config/uploads';
import { recoverLegacyPhotos } from './services/legacyPhotos';
import teacherProfileRoutes from './routes/teacherProfile.routes';
import courseLearningRoutes from './routes/courseLearning.routes';
import { createServer } from 'http';
import { attachChat } from './chatSocket';
import parentRoutes from './routes/parent.routes';
import chatRoutes from './routes/chat.routes';
import { backfillStudentIdentities } from './utils/studentIdentity';
import path from 'path';
import compression from 'compression';
import cors from 'cors';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import academicRoutes from './routes/academic.routes';
import adminUsersRoutes from './routes/adminUsers.routes';
import coursesRoutes from './routes/courses.routes';
import complaintsRoutes from './routes/complaints.routes';
import announcementsRoutes from './routes/announcements.routes';
import attendanceRoutes from './routes/attendance.routes';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import examsRoutes from './routes/exams.routes';
import feesRoutes from './routes/fees.routes';
import noticesRoutes from './routes/notices.routes';
import studentsRoutes from './routes/students.routes';
import studentPortalRoutes from './routes/studentPortal.routes';
import studentLearningRoutes from './routes/studentLearning.routes';
import teachersRoutes from './routes/teachers.routes';
import timetableRoutes from './routes/timetable.routes';
import { ApiError } from './utils/apiHelpers';

const app = express();

fs.mkdirSync(uploadPath, { recursive: true });

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = cookieHeader
    ? Object.fromEntries(cookieHeader.split(';').map((cookie) => {
        const [name, ...parts] = cookie.trim().split('=');
        return [name, decodeURIComponent(parts.join('='))];
      }))
    : {};
  next();
});

app.use('/uploads', express.static(uploadPath, { maxAge: '7d', immutable: env.NODE_ENV === 'production' }));
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', environment: env.NODE_ENV, timestamp: new Date().toISOString() } });
});

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/search', adminSearchRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/course-learning', courseLearningRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/personalized-quizzes', personalizedQuizRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/student', studentLearningRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/teacher', teacherProfileRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/timetable', timetableRoutes);

app.use((_req, _res, next) => next(new ApiError(404, 'Route not found')));
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;

const start = async () => {
  await connectDB();
  await recoverLegacyPhotos();
  startPracticeWorker();
  startAssignedQuizWorker();
  await backfillStudentIdentities();
  server = createServer(app);
  attachChat(server);
  server.listen(env.PORT, () => console.log(`🚀 EduCore API listening on http://localhost:${env.PORT}`));
};

const shutdown = (signal: string) => {
  console.log(`\n${signal} received. Closing server...`);
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;

