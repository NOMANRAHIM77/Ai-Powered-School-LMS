import fs from 'fs/promises';
import path from 'path';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { uploadPath } from '../config/uploads';
import { encodeStudentPhoto } from '../middleware/studentPhoto';

// Preserve the source files; only replace an unchanged legacy reference after decoding succeeds.
export async function recoverLegacyPhotos() {
  let recovered = 0, missing = 0;
  for (const Model of [Student, Teacher] as any[]) {
    const records = await Model.find({ photo: { $regex: 'uploads[/\\\\]' } }).select('_id photo').lean();
    for (const record of records) {
      const normalized = record.photo.replace(/\\/g, '/');
      const filename = normalized.split('/').pop()?.split('?')[0];
      if (!filename || filename === '.' || filename === '..') continue;
      const roots = [uploadPath, path.resolve(process.cwd(), 'uploads'), path.resolve(__dirname, '../../../uploads')];
      let buffer: Buffer | undefined;
      for (const root of roots) {
        try { buffer = await fs.readFile(path.join(root, filename)); break; } catch { /* Try a previous upload location. */ }
      }
      if (!buffer) { missing++; continue; }
      try {
        const photo = await encodeStudentPhoto({ buffer } as Express.Multer.File);
        await Model.updateOne({ _id: record._id, photo: record.photo }, { $set: { photo } }); recovered++;
      } catch { missing++; }
    }
  }
  if (recovered || missing) console.log(`Profile photos: ${recovered} recovered; ${missing} missing/unreadable files need a new upload.`);
}
