import { Class } from '../models/Class';
import { Types } from 'mongoose';
import { Section } from '../models/Section';
import { Course } from '../models/Course';
import { subjectsForSection } from './courseCatalog';
import { wingForClass } from './schoolWings';

export async function prepareCourses(yearId: Types.ObjectId) {
  const classes = await Class.find({ academicYearId: yearId }).lean();
  const sections = await Section.find({ classId: { $in: classes.map(item => item._id) } }).lean();
  const operations = sections.flatMap(section => {
    const schoolClass = classes.find(item => String(item._id) === String(section.classId));
    return subjectsForSection(wingForClass(schoolClass?.name ?? '') ?? '', section.name).map(subjectName => ({ updateOne: { filter: { academicYearId: yearId, sectionId: section._id, subjectName }, update: { $setOnInsert: { academicYearId: yearId, classId: section.classId, sectionId: section._id, subjectName } }, upsert: true } }));
  });
  if (operations.length) await Course.bulkWrite(operations);
}
