import { Student } from '../models/Student';
import { Enrollment } from '../models/Enrollment';
import { AcademicYear } from '../models/AcademicYear';
import { Course } from '../models/Course';
import { Teacher } from '../models/Teacher';
import { wingForClass } from '../utils/schoolWings';
import { ApiError } from '../utils/apiHelpers';

export async function chatContacts(user: { _id: string; role: string }) {
  if (!['parent', 'teacher'].includes(user.role)) throw new ApiError(403, 'Chat is for parents and teachers');
  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) return [];
  const teacher = user.role === 'teacher' ? await Teacher.findOne({ userId: user._id }) : null;
  if (user.role === 'teacher' && !teacher) return [];
  const courses: any[] = await Course.find({ academicYearId: year._id, ...(teacher ? { teacherId: teacher._id } : { teacherId: { $ne: null } }) }).populate({ path: 'teacherId', populate: { path: 'userId', select: 'name isActive removedAt' } }).lean();
  const enrollments: any[] = await Enrollment.find({ academicYearId: year._id, status: 'active', sectionId: { $in: courses.map(c => c.sectionId) } }).populate({ path: 'sectionId', populate: { path: 'classId', select: 'name' } }).lean();
  const students: any[] = await Student.find({ _id: { $in: enrollments.map(e => e.studentId) }, status: 'active', ...(user.role === 'parent' ? { guardianIds: user._id } : {}) }).select('userId guardianIds studentCode').populate('userId', 'name isActive removedAt').populate('guardianIds', 'name role isActive removedAt').lean();
  const contacts = new Map<string, any>();
  for (const student of students) {
    if (!student.userId?.isActive || student.userId.removedAt) continue;
    const enrollment = enrollments.find(e => String(e.studentId) === String(student._id));
    if (!enrollment?.sectionId?.classId) continue;
    for (const course of courses.filter(c => String(c.sectionId) === String(enrollment.sectionId._id))) {
      const teacherUser = course.teacherId?.userId;
      if (!teacherUser?.isActive || teacherUser.removedAt) continue;
      for (const parent of student.guardianIds.filter((p: any) => p?.role === 'parent' && p.isActive && !p.removedAt && (user.role !== 'parent' || String(p._id) === user._id))) {
        const key = `${student._id}:${parent._id}:${teacherUser._id}`;
        const existing = contacts.get(key);
        if (existing) { if (!existing.subjects.includes(course.subjectName)) existing.subjects.push(course.subjectName); continue; }
        const section = enrollment.sectionId.name;
        contacts.set(key, { key, studentId: String(student._id), parentId: String(parent._id), teacherId: String(teacherUser._id), parentName: parent.name, teacherName: teacherUser.name, studentName: student.userId.name, studentCode: student.studentCode, className: enrollment.sectionId.classId.name, wing: wingForClass(enrollment.sectionId.classId.name), stream: section.includes(' - ') ? section.split(' - ')[0] : 'General', section: section.split(' - ').pop(), subjects: [course.subjectName] });
      }
    }
  }
  return [...contacts.values()];
}
export async function requireContact(user: { _id: string; role: string }, key: string) {
  const contact = (await chatContacts(user)).find(c => c.key === key);
  if (!contact) throw new ApiError(403, 'This conversation is not available to your account');
  return contact;
}
