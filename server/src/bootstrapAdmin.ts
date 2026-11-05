import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from './config/db';
import { User } from './models/User';

async function main() {
  const parsed = z.object({ ADMIN_BOOTSTRAP_EMAIL: z.string().email(), ADMIN_BOOTSTRAP_PASSWORD: z.string().min(1), ADMIN_BOOTSTRAP_NAME: z.string().min(2).max(120).default('School Administrator') }).safeParse(process.env);
  if (!parsed.success) throw new Error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in server/.env.');
  const { ADMIN_BOOTSTRAP_EMAIL: email, ADMIN_BOOTSTRAP_PASSWORD: password, ADMIN_BOOTSTRAP_NAME: name } = parsed.data;
  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshTokens');
  if (existing) {
    if (existing.role !== 'admin') throw new Error('That email belongs to a non-admin account; no changes were made.');
    if (!process.argv.includes('--reset-existing')) throw new Error('That admin already exists. Sign in with its existing password, or run this command with --reset-existing to replace it.');
    existing.passwordHash = password;
    existing.sessionVersion = (existing.sessionVersion ?? 0) + 1;
    existing.refreshTokens = [];
    existing.isActive = true;
    await existing.save();
    console.log(`Admin password updated for ${email}.`);
  } else {
    if (await User.exists({ role: 'admin' })) throw new Error('An admin account already exists. For safety, bootstrap cannot create another; sign in with the existing admin.');
    await User.create({ name, email, passwordHash: password, role: 'admin', isActive: true });
    console.log(`Admin account created for ${email}.`);
  }
  await mongoose.disconnect();
}
main().catch(async (error) => { console.error('Admin setup failed:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
