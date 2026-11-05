import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

// Hash the complete UTF-8 password before bcrypt so bcrypt's 72-byte input limit
// cannot silently make different long passwords equivalent.
const prefix = 'bcrypt-sha256$';
const digest = (password: string) => createHash('sha256').update(password, 'utf8').digest('base64');

export async function hashPassword(password: string): Promise<string> {
  return prefix + await bcrypt.hash(digest(password), 12);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(prefix)) return bcrypt.compare(digest(password), storedHash.slice(prefix.length));
  // Existing users retain their original bcrypt credentials until they change them.
  return bcrypt.compare(password, storedHash);
}
