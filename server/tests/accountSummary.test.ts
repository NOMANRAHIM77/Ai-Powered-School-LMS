import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Teacher } from '../src/models/Teacher';
import { Enrollment } from '../src/models/Enrollment';
import { AcademicYear } from '../src/models/AcademicYear';
import { Class } from '../src/models/Class';
import { getAccountSummary } from '../src/utils/accountSummary';

test('dashboard combines class boundaries into wings and separates disabled and unassigned accounts', async () => {
  const old = { users: User.aggregate, teachers: Teacher.aggregate, enrollments: Enrollment.aggregate, year: AcademicYear.findOne, classes: Class.find };
  const yearId = new Types.ObjectId();
  const classes = ['Class 1', 'Grade 8', '9', 'Class 10', 'Grade 11', '12', 'Nursery'].map(name => ({ _id: new Types.ObjectId(), name }));
  let currentYear: any = { _id: yearId, name: '2026–2027' };
  let enrollmentReads = 0; let teacherReads = 0;
  (AcademicYear as any).findOne = () => ({ select: () => ({ lean: async () => currentYear }) });
  (User as any).aggregate = async () => [
    { _id: 'student', total: 40, active: 35 }, { _id: 'teacher', total: 12, active: 10 }, { _id: 'admin', total: 1, active: 1 },
  ];
  (Class as any).find = (filter: any) => {
    assert.equal(String(filter.academicYearId), String(yearId));
    return { select: () => ({ lean: async () => classes }) };
  };
  (Enrollment as any).aggregate = async (pipeline: any[]) => {
    enrollmentReads++;
    assert.equal(String(pipeline[0].$match.academicYearId), String(yearId));
    assert.equal(pipeline[0].$match.status, 'active');
    assert.ok(pipeline.some(stage => stage.$match?.['account.isActive'] === true && stage.$match?.['account.removedAt'] === null));
    return classes.map((item, index) => ({ _id: item._id, count: index + 1 }));
  };
  (Teacher as any).aggregate = async (pipeline: any[]) => {
    teacherReads++;
    assert.equal(String(pipeline[0].$match.assignmentAcademicYearId), String(yearId));
    assert.ok(pipeline.some(stage => stage.$match?.['account.isActive'] === true && stage.$match?.['account.removedAt'] === null));
    return [{ _id: 'primary', count: 4 }, { _id: 'secondary', count: 2 }, { _id: 'higher', count: 1 }];
  };
  try {
    const summary = await getAccountSummary();
    assert.deepEqual(summary.totals, { student: 40, teacher: 12, parent: 0, admin: 1 });
    assert.deepEqual(summary.students, { total: 40, active: 35, disabled: 5, unassigned: 14, wings: { primary: 3, secondary: 7, higher: 11 } });
    assert.deepEqual(summary.teachers, { total: 12, active: 10, disabled: 2, unassigned: 3, wings: { primary: 4, secondary: 2, higher: 1 } });
    currentYear = null;
    const noYear = await getAccountSummary();
    assert.equal(noYear.year, null);
    assert.deepEqual(noYear.students.wings, { primary: 0, secondary: 0, higher: 0 });
    assert.deepEqual(noYear.teachers.wings, { primary: 0, secondary: 0, higher: 0 });
    assert.equal(noYear.students.unassigned, 35); assert.equal(noYear.teachers.unassigned, 10);
    assert.equal(enrollmentReads, 1); assert.equal(teacherReads, 1);
  } finally {
    (User as any).aggregate = old.users; (Teacher as any).aggregate = old.teachers; (Enrollment as any).aggregate = old.enrollments;
    (AcademicYear as any).findOne = old.year; (Class as any).find = old.classes;
  }
});
