import { Schema, model } from 'mongoose';
import { Class } from '../models/Class';
import { gradeForClass, wingForClass } from './schoolWings';
import { ApiError } from './apiHelpers';
import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { Section } from '../models/Section';
const counter = model('StudentIdentityCounter', new Schema({ _id: String, value: { type: Number, default: 0 } }));
export async function nextStudentIdentity(section: { classId: unknown; name: string }) {
  const schoolClass = await Class.findById(section.classId);
  const grade = gradeForClass(schoolClass?.name ?? '');
  const wing = wingForClass(schoolClass?.name ?? '');
  if (!grade || !wing) throw new ApiError(400, 'A standard class is required to generate a student ID');
  const stream = section.name.startsWith('Computer Science - ') ? 'cs' : section.name.startsWith('Pre-Engineering - ') ? 'eng' : section.name.startsWith('Medical - ') ? 'med' : section.name.startsWith('Humanities - ') ? 'hum' : 'gen';
  const sequence = await counter.findOneAndUpdate({ _id: 'students' }, { $inc: { value: 1 } }, { upsert: true, new: true });
  return `${wing === 'primary' ? 'pri' : wing === 'secondary' ? 'sec' : 'high'}-${stream}-${grade}-${String(sequence!.value).padStart(4, '0')}-${section.name.split(' - ').pop()}`;
}

export async function backfillStudentIdentities() {
  // Change only separators; guardian links and student ObjectIds remain unchanged.
  for await (const student of Student.find({ studentCode: /,/ }).cursor()) {
    await Student.updateOne({ _id: student._id, studentCode: student.studentCode }, { $set: { studentCode: student.studentCode!.replace(/,/g, '-') } });
  }
  for await (const student of Student.find({ $or: [{ studentCode: { $exists: false } }, { studentCode: null }, { studentCode: '' }] }).cursor()) {
    const enrollment = await Enrollment.findOne({ studentId: student._id }).sort({ enrolledAt: -1 });
    const section = enrollment ? await Section.findById(enrollment.sectionId) : null;
    if (!section) continue;
    const schoolClass = await Class.findById(section.classId);
    if (!gradeForClass(schoolClass?.name ?? '')) continue;
    const code = await nextStudentIdentity(section);
    await Student.updateOne({ _id: student._id, $or: [{ studentCode: { $exists: false } }, { studentCode: null }, { studentCode: '' }] }, { $set: { studentCode: code } });
  }
}
