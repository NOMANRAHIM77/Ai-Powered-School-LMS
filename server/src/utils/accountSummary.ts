import { User, UserRole } from '../models/User';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { Enrollment } from '../models/Enrollment';
import { Section } from '../models/Section';
import { Class } from '../models/Class';
import { AcademicYear } from '../models/AcademicYear';
import { SchoolWing, wingForClass } from './schoolWings';

const emptyWings = (): Record<SchoolWing, number> => ({ primary: 0, secondary: 0, higher: 0 });
const sumWings = (wings: Record<SchoolWing, number>) => wings.primary + wings.secondary + wings.higher;

export async function getAccountSummary() {
  const [year, accountRows] = await Promise.all([
    AcademicYear.findOne({ isCurrent: true }).select('_id name').lean(),
    User.aggregate<{ _id: UserRole; total: number; active: number }>([
      { $match: { removedAt: null } },
      { $group: { _id: '$role', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
    ]),
  ]);
  const totals: Record<UserRole, number> = { student: 0, teacher: 0, parent: 0, admin: 0 };
  const active = { ...totals };
  for (const row of accountRows) {
    if (Object.prototype.hasOwnProperty.call(totals, row._id)) { totals[row._id] = row.total; active[row._id] = row.active; }
  }
  const studentWings = emptyWings(); const teacherWings = emptyWings();
  if (year) {
    const classes = await Class.find({ academicYearId: year._id }).select('_id name').lean();
    const [studentRows, teacherRows] = await Promise.all([
      Enrollment.aggregate<{ _id: unknown; count: number }>([
        { $match: { academicYearId: year._id, status: 'active' } },
        { $lookup: { from: Student.collection.name, localField: 'studentId', foreignField: '_id', as: 'student' } },
        { $unwind: '$student' },
        { $lookup: { from: User.collection.name, localField: 'student.userId', foreignField: '_id', as: 'account' } },
        { $unwind: '$account' },
        { $match: { 'account.role': 'student', 'account.isActive': true, 'account.removedAt': null } },
        { $lookup: { from: Section.collection.name, localField: 'sectionId', foreignField: '_id', as: 'section' } },
        { $unwind: '$section' },
        { $match: { 'section.classId': { $in: classes.map(item => item._id) } } },
        { $group: { _id: '$account._id', classId: { $first: '$section.classId' } } },
        { $group: { _id: '$classId', count: { $sum: 1 } } },
      ]),
      Teacher.aggregate<{ _id: SchoolWing; count: number }>([
        { $match: { assignmentAcademicYearId: year._id, wing: { $in: ['primary', 'secondary', 'higher'] } } },
        { $lookup: { from: User.collection.name, localField: 'userId', foreignField: '_id', as: 'account' } },
        { $unwind: '$account' },
        { $match: { 'account.role': 'teacher', 'account.isActive': true, 'account.removedAt': null } },
        { $group: { _id: '$account._id', wing: { $first: '$wing' } } },
        { $group: { _id: '$wing', count: { $sum: 1 } } },
      ]),
    ]);
    const classWings = new Map(classes.map(item => [String(item._id), wingForClass(item.name)]));
    for (const row of studentRows) { const wing = classWings.get(String(row._id)); if (wing) studentWings[wing] += row.count; }
    for (const row of teacherRows) { if (Object.prototype.hasOwnProperty.call(teacherWings, row._id)) teacherWings[row._id] += row.count; }
  }
  const strength = (role: 'student' | 'teacher', wings: Record<SchoolWing, number>) => ({
    total: totals[role], active: active[role], disabled: totals[role] - active[role], wings,
    unassigned: Math.max(0, active[role] - sumWings(wings)),
  });
  return { year, totals, students: strength('student', studentWings), teachers: strength('teacher', teacherWings) };
}
