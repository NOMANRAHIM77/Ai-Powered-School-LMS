import { Grade } from '../models/Result';

export interface GradeRule {
  min: number;
  max: number;
  grade: Grade;
  label: string;
}

export const GRADING_SCALE: GradeRule[] = [
  { min: 90, max: 100, grade: 'A+', label: 'Outstanding' },
  { min: 80, max: 89,  grade: 'A',  label: 'Excellent' },
  { min: 70, max: 79,  grade: 'B',  label: 'Good' },
  { min: 60, max: 69,  grade: 'C',  label: 'Satisfactory' },
  { min: 50, max: 59,  grade: 'D',  label: 'Pass' },
  { min: 0,  max: 49,  grade: 'F',  label: 'Fail' },
];

export const getGrade = (obtained: number, total: number): Grade => {
  if (total === 0) return 'F';
  const percentage = (obtained / total) * 100;
  const rule = GRADING_SCALE.find(r => percentage >= r.min && percentage <= r.max);
  return rule ? rule.grade : 'F';
};

export const getPercentage = (obtained: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((obtained / total) * 10000) / 100;
};

export const isPassed = (marks: Array<{ obtained: number; totalMarks: number; passingMarks: number }>): boolean => {
  return marks.every(m => m.obtained >= m.passingMarks);
};
