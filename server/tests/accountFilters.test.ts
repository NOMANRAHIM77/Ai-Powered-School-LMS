import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { accountQuery, buildAccountFilter, accountSort } from '../src/utils/accountFilters';
import { Student } from '../src/models/Student';
import { Teacher } from '../src/models/Teacher';
import { AcademicYear } from '../src/models/AcademicYear';
import { Class } from '../src/models/Class';
import { Section } from '../src/models/Section';
import { Enrollment } from '../src/models/Enrollment';

test('account searches escape patterns and combine school filters before pagination', async () => {
  const old = { student: Student.distinct, teacher: Teacher.distinct, year: AcademicYear.findOne, classes: Class.find, sections: Section.distinct, enrollments: Enrollment.distinct };
  const userId = new Types.ObjectId(); const studentId = new Types.ObjectId(); const yearId = new Types.ObjectId(); const classId = new Types.ObjectId(); const sectionId = new Types.ObjectId();
  let studentFilter: any; let classFilter: any; let sectionFilter: any; let enrollmentFilter: any;
  (Student as any).distinct = async (_field: string, query: any) => { studentFilter = query; return [userId]; };
  (Teacher as any).distinct = async () => [userId];
  (AcademicYear as any).findOne = () => ({ select: async () => ({ _id: yearId }) });
  (Class as any).find = (query: any) => { classFilter = query; return { select: () => ({ lean: async () => [{ _id: classId, name: 'Grade 9' }] }) }; };
  (Section as any).distinct = async (_field: string, query: any) => { sectionFilter = query; return [sectionId]; };
  (Enrollment as any).distinct = async (_field: string, query: any) => { enrollmentFilter = query; return [studentId]; };
  try {
    const query = accountQuery.parse({ search: 'S.*', status: 'disabled', gender: 'female', wing: 'secondary', classId: String(classId), sectionId: String(sectionId), stream: 'Medical', page: 3, limit: 10 });
    const filter = await buildAccountFilter(query, 'student');
    assert.equal(filter.isActive, false); assert.equal(filter.role, 'student'); assert.equal(filter.removedAt, null);
    assert.equal(filter.$and?.length, 2);
    const regex = filter.$and![0].$or![0].name as RegExp;
    assert.equal(regex.test('S123'), false); assert.equal(regex.test('S.*'), true);
    assert.deepEqual(studentFilter, { gender: 'female', _id: { $in: [studentId] } });
    assert.equal(String(classFilter.academicYearId), String(yearId));
    assert.deepEqual(sectionFilter.classId.$in, [classId]); assert.equal(sectionFilter.name.test('Medical - A'), true); assert.equal(sectionFilter.name.test('Humanities - A'), false);
    assert.equal(String(enrollmentFilter.academicYearId), String(yearId)); assert.equal(enrollmentFilter.status, 'active');
    const parent = await buildAccountFilter(accountQuery.parse({ search: 'parent@example.test', status: 'active' }), 'parent');
    assert.equal(parent.role, 'parent'); assert.equal(parent.isActive, true); assert.equal(parent.$and?.length, 1);
    assert.deepEqual(accountSort('name'), { name: 1, _id: 1 });
    assert.equal(accountQuery.safeParse({ sectionId: 'invalid' }).success, false);
  } finally {
    (Student as any).distinct = old.student; (Teacher as any).distinct = old.teacher; (AcademicYear as any).findOne = old.year; (Class as any).find = old.classes; (Section as any).distinct = old.sections; (Enrollment as any).distinct = old.enrollments;
  }
});
