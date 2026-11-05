import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Resolve from the server directory so startup works regardless of the shell cwd.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  GROQ_API_KEY: z.string().trim().default(''),
  GROQ_CHAT_MODEL: z.string().default('openai/gpt-oss-20b'),
  AI_VECTOR_INDEX: z.string().default('course_content_local_v1'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform(v => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('School LMS <noreply@schoollms.com>'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.string().default('5242880').transform(Number),
  SCHOOL_NAME: z.string().default('Bright Future Academy'),
  SCHOOL_ADDRESS: z.string().default('123 Education Road, Karachi'),
  SCHOOL_PHONE: z.string().default('+92-21-12345678'),
  SCHOOL_EMAIL: z.string().default('info@school.edu'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
