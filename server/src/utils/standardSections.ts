import { Types } from 'mongoose';
import { Class } from '../models/Class';
import { Section } from '../models/Section';
import { gradeForClass } from './schoolWings';
import { prepareCourses } from './prepareCourses';

export const streams = ['Pre-Engineering', 'Computer Science', 'Medical', 'Humanities'] as const;
export const standardSectionNames = (grade: number) => grade <= 8 ? ['A', 'B', 'C', 'D'] : streams.flatMap(stream => ['A', 'B', 'C', 'D'].map(section => `${stream} - ${section}`));

// Keep existing records and reuse recognized class names such as "Class 8".
export async function prepareStandardSections(yearId: Types.ObjectId) {
  let classes = await Class.find({ academicYearId: yearId }).select('_id name').lean();
  const missing = Array.from({ length: 12 }, (_, index) => index + 1).filter(grade => !classes.some(item => gradeForClass(item.name) === grade));
  if (missing.length) await Class.bulkWrite(missing.map(grade => ({ updateOne: { filter: { academicYearId: yearId, name: `Grade ${grade}` }, update: { $setOnInsert: { academicYearId: yearId, name: `Grade ${grade}`, displayOrder: grade } }, upsert: true } })));
  classes = await Class.find({ academicYearId: yearId }).select('_id name').lean();
  const operations = Array.from({ length: 12 }, (_, index) => index + 1).flatMap(grade => {
    const schoolClass = classes.find(item => gradeForClass(item.name) === grade);
    return schoolClass ? standardSectionNames(grade).map(name => ({ updateOne: { filter: { classId: schoolClass._id, name }, update: { $setOnInsert: { classId: schoolClass._id, name } }, upsert: true } })) : [];
  });
  if (operations.length) await Section.bulkWrite(operations);
  await prepareCourses(yearId);
}
