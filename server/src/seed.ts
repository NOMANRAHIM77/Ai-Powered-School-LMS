import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { AcademicYear } from './models/AcademicYear';
import { Class } from './models/Class';
import { User } from './models/User';

const seed = async () => {
  await connectDB();

  let academicYear = await AcademicYear.findOne({ name: '2026–27' });
  if (!academicYear) {
    academicYear = await AcademicYear.create({
      name: '2026–27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    });
  }

  const existingClasses = await Class.countDocuments({ academicYearId: academicYear._id });
  if (!existingClasses) {
    await Class.insertMany(
      ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map((name, index) => ({
        name,
        academicYearId: academicYear!._id,
        displayOrder: index + 6,
      }))
    );
  }

  console.log('✅ Seed complete');
  if (!await User.exists({ role: 'admin' })) console.log('   No admin exists yet; configure ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD and run npm run bootstrap:admin.');
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
