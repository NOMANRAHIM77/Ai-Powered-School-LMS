import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { AcademicYear } from '../src/models/AcademicYear';
import { Student } from '../src/models/Student';
import { Enrollment } from '../src/models/Enrollment';
import { Course } from '../src/models/Course';
import { Teacher } from '../src/models/Teacher';
import { User } from '../src/models/User';
import { chatContacts, requireContact } from '../src/services/familyChat';
import { socketIdentity } from '../src/chatSocket';
import { generateAccessToken } from '../src/utils/tokens';

test('chat contacts follow current courses, guardian ownership and active accounts', async () => {
  const original = [AcademicYear.findOne, Student.find, Enrollment.find, Course.find, Teacher.findOne];
  const parentId = String(new Types.ObjectId()), teacherUserId = String(new Types.ObjectId()), sectionId = new Types.ObjectId(), studentId = new Types.ObjectId(), teacherId = new Types.ObjectId();
  const parent: any = { _id: parentId, name: 'Parent', role: 'parent', isActive: true };
  const teacherUser: any = { _id: teacherUserId, name: 'Teacher', isActive: true };
  const student = { _id: studentId, guardianIds: [parent], userId: { name: 'Child', isActive: true }, studentCode: 'high-cs-11-0001-A' };
  const query = (value: any) => { const q: any = { populate: () => q, select: () => q, lean: async () => value }; return q; };
  (AcademicYear as any).findOne = async () => ({ _id: 'year' });
  (Teacher as any).findOne = async () => ({ _id: teacherId });
  (Course as any).find = (filter: any) => { assert.equal(filter.academicYearId, 'year'); return query(['Math', 'Physics'].map(subjectName => ({ subjectName, sectionId, teacherId: { _id: teacherId, userId: teacherUser } }))); };
  (Enrollment as any).find = (filter: any) => { assert.equal(filter.status, 'active'); return query([{ studentId, sectionId: { _id: sectionId, name: 'Computer Science - A', classId: { name: 'Grade 11' } } }]); };
  (Student as any).find = (filter: any) => query(!filter.guardianIds || filter.guardianIds === parentId ? [student] : []);
  try {
    const contacts = await chatContacts({ _id: parentId, role: 'parent' });
    assert.equal(contacts.length, 1); assert.deepEqual(contacts[0].subjects, ['Math', 'Physics']); assert.equal(contacts[0].wing, 'higher'); assert.equal(contacts[0].section, 'A');
    assert.equal((await chatContacts({ _id: teacherUserId, role: 'teacher' })).length, 1);
    await assert.rejects(requireContact({ _id: String(new Types.ObjectId()), role: 'parent' }, contacts[0].key));
    await assert.rejects(chatContacts({ _id: parentId, role: 'student' }));
    parent.isActive = false; assert.equal((await chatContacts({ _id: teacherUserId, role: 'teacher' })).length, 0);
    parent.isActive = true; teacherUser.isActive = false; assert.equal((await chatContacts({ _id: parentId, role: 'parent' })).length, 0);
  } finally { [AcademicYear.findOne, Student.find, Enrollment.find, Course.find, Teacher.findOne] = original as any; }
});

test('socket authentication rejects disabled accounts and revoked sessions', async () => {
  const original = User.findById; const id = String(new Types.ObjectId());
  const user: any = { _id: id, role: 'parent', isActive: true, sessionVersion: 0 };
  (User as any).findById = () => ({ select: async () => user });
  const token = generateAccessToken({ _id: id, role: 'parent', name: 'Parent', email: 'parent@example.test' });
  try {
    assert.equal((await socketIdentity(token))._id, id);
    user.sessionVersion = 1; await assert.rejects(socketIdentity(token));
    user.sessionVersion = 0; user.isActive = false; await assert.rejects(socketIdentity(token));
    await assert.rejects(socketIdentity('invalid'));
  } finally { User.findById = original; }
});

