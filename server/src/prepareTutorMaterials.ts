import mongoose from 'mongoose';
import { env } from './config/env';
import { CourseActivity } from './models/CourseActivity';
import { TutorSource } from './models/TutorContent';
import { EMBEDDING_MODEL, indexMaterial } from './services/courseTutor';
import { ApiError } from './utils/apiHelpers';

// Safe to rerun: already prepared materials with the current model are skipped.
async function prepare() {
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
    const materials = await CourseActivity.find({ kind: 'material' }).select('_id courseId').lean();
    let prepared = 0, skipped = 0, failed = 0;
    for (const material of materials) {
      if (await TutorSource.exists({ activityId: material._id, status: 'ready', embeddingModel: EMBEDDING_MODEL })) { skipped++; continue; }
      try {
        const result = await indexMaterial(String(material._id), String(material.courseId));
        prepared++;
        console.log(`Prepared material ${material._id}: ${result.chunks} passages${result.warning ? ' (some attachments need a readable transcript)' : ''}.`);
      } catch (error) {
        failed++;
        console.error(`Material ${material._id}: ${error instanceof ApiError ? error.message : 'preparation failed'}`);
      }
    }
    console.log(`Materials: ${prepared} prepared, ${skipped} already ready, ${failed} failed.`);
    if (failed) process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
prepare().catch(() => { console.error('Preparation could not finish. Check MongoDB connectivity and local model availability.'); process.exitCode = 1; });
