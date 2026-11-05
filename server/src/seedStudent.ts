import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { env } from './config/env';
import { User } from './models/User';
import { Student } from './models/Student';
import { AcademicYear } from './models/AcademicYear';
import { Class } from './models/Class';
import { Section } from './models/Section';
import { Enrollment } from './models/Enrollment';

async function seedStudent() {
  if (env.NODE_ENV === 'production') throw new Error('Student demo seed is disabled in production');
  const password = process.env.SEED_STUDENT_PASSWORD;
  if (!password) throw new Error('Set SEED_STUDENT_PASSWORD in server/.env');
  await connectDB();
  const email = 'ayesha.student@example.test';
  let user = await User.findOne({ email });
  if (user && user.role !== 'student') throw new Error('The seed email belongs to a non-student account');
  if (!user) user = await User.create({ name: 'Ayesha Khan', email, passwordHash: password, role: 'student', isActive: true });
  let student = await Student.findOne({ userId: user._id });
  if (!student) student = await Student.create({ userId: user._id, admissionNo: 'DEMO-STU-001', rollNo: '01', dob: new Date('2012-04-15'), gender: 'female', status: 'active' });
  const year = await AcademicYear.findOne({ isCurrent: true });
  if (year) {
    const schoolClass = await Class.findOne({ academicYearId: year._id, name: 'Grade 8' });
    if (schoolClass) {
      const section = await Section.findOneAndUpdate({ classId: schoolClass._id, name: 'A' }, { $setOnInsert: { classId: schoolClass._id, name: 'A' } }, { upsert: true, new: true });
      await Enrollment.findOneAndUpdate({ studentId: student._id, academicYearId: year._id }, { $setOnInsert: { studentId: student._id, academicYearId: year._id, sectionId: section._id, status: 'active', rollNo: '01' } }, { upsert: true });
    }
  }
  console.log(`Student seed ready: ${email}. Existing accounts were not overwritten.`);
  if (!year) console.log('No current academic year found; run the regular seed or create an enrollment separately.');
  await mongoose.disconnect();
}

seedStudent().catch(async (error) => { console.error('Student seed failed:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
