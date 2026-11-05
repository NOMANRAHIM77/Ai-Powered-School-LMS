import { z } from 'zod';
import { FilterQuery } from 'mongoose';
import { IUser, UserRole } from '../models/User';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { AcademicYear } from '../models/AcademicYear';
import { Class } from '../models/Class';
import { Section } from '../models/Section';
import { Enrollment } from '../models/Enrollment';
import { wingForClass } from './schoolWings';
import { streams } from './standardSections';

const id = z.string().regex(/^[a-f\d]{24}$/i).optional();
export const accountQuery = z.object({
  smart: z.string().max(4000).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20),
  role: z.enum(['admin', 'teacher', 'student', 'parent']).optional(),
  search: z.string().trim().max(120).default(''), status: z.enum(['active', 'disabled']).optional(),
  wing: z.enum(['primary', 'secondary', 'higher']).optional(), classId: id, sectionId: id,
  stream: z.enum(streams).optional(), gender: z.enum(['male', 'female', 'other']).optional(),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});
export const escapeSearch = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const accountSort = (sort: string): Record<string, 1 | -1> => sort === 'name' ? { name: 1, _id: 1 } : sort === 'oldest' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

export async function buildAccountFilter(query: z.infer<typeof accountQuery>, selectedRole?: UserRole): Promise<FilterQuery<IUser>> {
  const filter: FilterQuery<IUser> = { removedAt: null, ...(selectedRole ? { role: selectedRole } : {}) };
  if (query.status) filter.isActive = query.status === 'active';
  const conditions: FilterQuery<IUser>[] = [];
  if (query.search) {
    const match = new RegExp(escapeSearch(query.search), 'i');
    const profileIds = selectedRole === 'student' ? await Student.distinct('userId', { admissionNo: match }) : selectedRole === 'teacher' ? await Teacher.distinct('userId', { employeeId: match }) : [];
    conditions.push({ $or: [{ name: match }, { email: match }, { _id: { $in: profileIds } }] });
  }
  const academicFilter = query.wing || query.classId || query.sectionId || query.stream;
  if (selectedRole === 'student' && (academicFilter || query.gender)) {
    const studentFilter: Record<string, unknown> = query.gender ? { gender: query.gender } : {};
    if (academicFilter) {
      const year = await AcademicYear.findOne({ isCurrent: true }).select('_id');
      const sectionIds = year ? await matchingSections(query, year._id) : [];
      studentFilter._id = { $in: year ? await Enrollment.distinct('studentId', { academicYearId: year._id, status: 'active', sectionId: { $in: sectionIds } }) : [] };
    }
    conditions.push({ _id: { $in: await Student.distinct('userId', studentFilter) } });
  }
  if (selectedRole === 'teacher' && academicFilter) {
    const teacherFilter: Record<string, unknown> = query.wing ? { wing: query.wing } : {};
    if (query.classId || query.sectionId || query.stream) {
      const year = await AcademicYear.findOne({ isCurrent: true }).select('_id');
      teacherFilter.sectionIds = { $in: year ? await matchingSections(query, year._id) : [] };
      if (year) teacherFilter.assignmentAcademicYearId = year._id;
    }
    conditions.push({ _id: { $in: await Teacher.distinct('userId', teacherFilter) } });
  }
  if (conditions.length) filter.$and = conditions;
  return filter;
}

async function matchingSections(query: z.infer<typeof accountQuery>, academicYearId: unknown) {
  const classes = await Class.find({ academicYearId, ...(query.classId ? { _id: query.classId } : {}) }).select('_id name').lean();
  const classIds = classes.filter(item => !query.wing || wingForClass(item.name) === query.wing).map(item => item._id);
  return Section.distinct('_id', { classId: { $in: classIds }, ...(query.sectionId ? { _id: query.sectionId } : {}), ...(query.stream ? { name: new RegExp(`^${escapeSearch(query.stream)} - `) } : {}) });
}
