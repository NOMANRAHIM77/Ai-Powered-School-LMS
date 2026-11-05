import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

test('all server models and routes load together without model registration conflicts', async () => {
  // Load the same modules used at startup, without starting a listener or connecting to MongoDB.
  for (const directory of ['models', 'routes']) {
    const root = path.join(__dirname, '..', 'src', directory);
    for (const file of readdirSync(root).filter(name => name.endsWith('.ts')).sort()) {
      await import(path.join(root, file));
    }
  }
  const { Course: academic } = await import('../src/models/Course');
  const { Course: learning, Lesson, Assignment } = await import('../src/models/StudentLearning');
  const { CourseAttendance } = await import('../src/models/CourseAttendance');
  assert.notEqual(academic, learning);
  assert.equal(academic.modelName, 'AcademicCourse');
  assert.equal(academic.collection.name, 'academiccourses');
  assert.equal(learning.modelName, 'Course');
  assert.equal(learning.collection.name, 'courses');
  assert.ok(academic.schema.path('subjectName'));
  assert.ok(learning.schema.path('title'));
  assert.equal(CourseAttendance.schema.path('courseId').options.ref, 'AcademicCourse');
  assert.equal(Lesson.schema.path('courseId').options.ref, 'Course');
  assert.equal(Assignment.schema.path('courseId').options.ref, 'Course');
  assert.equal(mongoose.models.AcademicCourse, academic);
  assert.equal(mongoose.models.Course, learning);
});
