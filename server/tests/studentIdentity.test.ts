import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { Class } from '../src/models/Class';
import { nextStudentIdentity, backfillStudentIdentities } from '../src/utils/studentIdentity';
import { Student } from '../src/models/Student';
test('student IDs encode the validated class wing, stream and section with an atomic sequence', async () => {
  const counter = mongoose.models.StudentIdentityCounter;
  const old = { find: Class.findById, update: counter.findOneAndUpdate };
  let grade = 'Grade 11'; let sequence = 0;
  (Class as any).findById = async () => ({ name: grade });
  (counter as any).findOneAndUpdate = async (_filter: any, update: any, options: any) => { assert.deepEqual(update, { $inc: { value: 1 } }); assert.equal(options.upsert, true); return { value: ++sequence }; };
  try {
    assert.equal(await nextStudentIdentity({ classId: 'test', name: 'Computer Science - A' }), 'high-cs-11-0001-A');
    grade = 'Grade 9'; assert.equal(await nextStudentIdentity({ classId: 'test', name: 'Medical - B' }), 'sec-med-9-0002-B');
    grade = 'Grade 3'; assert.equal(await nextStudentIdentity({ classId: 'test', name: 'C' }), 'pri-gen-3-0003-C');
  } finally { (Class as any).findById = old.find; (counter as any).findOneAndUpdate = old.update; }
});

test('legacy ID migration changes only separators and is repeatable', async () => {
  const old = { find: Student.find, update: Student.updateOne };
  const student = { _id: 'existing-student', studentCode: 'high,cs,11,0001,A' };
  let writes = 0;
  (Student as any).find = (filter: any) => ({ cursor: async function* () { if (filter.studentCode && student.studentCode.includes(',')) yield { ...student }; } });
  (Student as any).updateOne = async (filter: any, update: any) => {
    assert.equal(filter._id, student._id);
    assert.equal(filter.studentCode, student.studentCode);
    assert.deepEqual(Object.keys(update.$set), ['studentCode']);
    student.studentCode = update.$set.studentCode; writes++;
  };
  try { await backfillStudentIdentities(); await backfillStudentIdentities(); assert.equal(student.studentCode, 'high-cs-11-0001-A'); assert.equal(writes, 1); }
  finally { Student.find = old.find; Student.updateOne = old.update; }
});

