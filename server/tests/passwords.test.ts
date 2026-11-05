import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from '../src/utils/passwords';

test('short and long passwords are verified without bcrypt truncation', async () => {
  const shortHash = await hashPassword('a');
  assert.equal(await verifyPassword('a', shortHash), true);
  assert.equal(await verifyPassword('b', shortHash), false);
  const long = 'a'.repeat(100) + 'one';
  const longHash = await hashPassword(long);
  assert.equal(await verifyPassword(long, longHash), true);
  assert.equal(await verifyPassword('a'.repeat(100) + 'two', longHash), false);
});

test('existing bcrypt passwords continue to work', async () => {
  const legacy = await bcrypt.hash('existing', 4);
  assert.equal(await verifyPassword('existing', legacy), true);
  assert.equal(await verifyPassword('incorrect', legacy), false);
});
