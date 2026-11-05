import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { Student } from '../src/models/Student';
import { resolveStudentScope, StudentRequest } from '../src/middleware/studentScope';
import { generateRefreshToken, hashRefreshToken, verifyRefreshToken } from '../src/utils/tokens';

test('refresh tokens are unique and stored as hashes', () => {
  const payload = { _id: new Types.ObjectId().toString(), role: 'student' as const, name: 'Ayesha', email: 'ayesha@example.test' };
  const first = generateRefreshToken(payload);
  const second = generateRefreshToken(payload);
  assert.notEqual(first, second);
  assert.notEqual(hashRefreshToken(first), first);
  assert.match(hashRefreshToken(first), /^[a-f0-9]{64}$/);
  assert.equal(verifyRefreshToken(first)._id, payload._id);
});

test('student scope derives identity from the signed-in account, not a supplied student ID', async () => {
  const original = Student.findOne;
  const ownId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  let query: unknown;
  (Student as any).findOne = (value: unknown) => { query = value; return { select: async () => ({ _id: ownId, schoolId }) }; };
  try {
    const req = { user: { _id: 'authenticated-user', role: 'student', name: 'Student', email: 's@example.test' }, query: { studentId: new Types.ObjectId().toString() } } as unknown as StudentRequest;
    let nextError: unknown;
    await resolveStudentScope(req, {} as any, (error?: unknown) => { nextError = error; });
    assert.equal(nextError, undefined);
    assert.deepEqual(query, { userId: 'authenticated-user', status: 'active' });
    assert.deepEqual(req.allowedStudentIds, [ownId]);
    assert.equal(req.schoolId, schoolId);
  } finally { (Student as any).findOne = original; }
});

test('student scope denies other roles', async () => {
  const req = { user: { _id: 'user', role: 'parent' } } as unknown as StudentRequest;
  let error: any;
  await resolveStudentScope(req, {} as any, (value?: unknown) => { error = value; });
  assert.equal(error?.statusCode, 403);
});
