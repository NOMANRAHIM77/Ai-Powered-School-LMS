import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPeriod {
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  start: string; // "08:00"
  end: string;   // "08:45"
  room?: string;
}

export interface ITimetable extends Document {
  sectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  periods: IPeriod[];
  createdAt: Date;
  updatedAt: Date;
}

const timetableSchema = new Schema<ITimetable>(
  {
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      required: true,
    },
    periods: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
        start: { type: String, required: true },
        end: { type: String, required: true },
        room: String,
      },
    ],
  },
  { timestamps: true }
);

timetableSchema.index({ sectionId: 1, academicYearId: 1, day: 1 }, { unique: true });

export const Timetable = mongoose.model<ITimetable>('Timetable', timetableSchema);
