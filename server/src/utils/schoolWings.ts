export type SchoolWing = 'primary' | 'secondary' | 'higher';

// Class names used by the school are either a grade number or "Class/Grade N".
export function gradeForClass(name: string): number | null {
  const match = name.trim().match(/^(?:(?:class|grade)\s*)?(1[0-2]|[1-9])$/i);
  return match ? Number(match[1]) : null;
}

export function wingForClass(name: string): SchoolWing | null {
  const grade = gradeForClass(name);
  if (grade === null) return null;
  return grade <= 8 ? 'primary' : grade <= 10 ? 'secondary' : 'higher';
}
