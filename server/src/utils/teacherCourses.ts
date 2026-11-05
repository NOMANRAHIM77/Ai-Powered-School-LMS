import { Types } from 'mongoose';
import { Course } from '../models/Course';
import { Section } from '../models/Section';
import { subjectsForSection } from './courseCatalog';
import { ApiError } from './apiHelpers';

export async function teacherCourseChoices(wing: string, sectionIds: string[], names: string[]) {
  const sections = await Section.find({ _id: { $in: sectionIds } }).select('_id name classId').lean();
  const choices = sections.flatMap(section => names.filter(name => subjectsForSection(wing, section.name).includes(name)).map(subjectName => ({ sectionId: section._id, classId: section.classId, subjectName })));
  if (sections.some(section => !choices.some(choice => String(choice.sectionId) === String(section._id))) || names.some(name => !choices.some(choice => choice.subjectName === name))) throw new ApiError(400, 'Select valid subjects covering every assigned section and stream');
  return choices;
}
export async function assignTeacherCourses(teacherId: Types.ObjectId, yearId: Types.ObjectId, choices: Awaited<ReturnType<typeof teacherCourseChoices>>) {
  for (const choice of choices) {
    const filter = { academicYearId: yearId, sectionId: choice.sectionId, subjectName: choice.subjectName };
    await Course.findOneAndUpdate({ ...filter, $or: [{ teacherId: null }, { teacherId }] }, { $set: { teacherId }, $setOnInsert: { ...filter, classId: choice.classId } }, { upsert: true, runValidators: true });
  }
}
