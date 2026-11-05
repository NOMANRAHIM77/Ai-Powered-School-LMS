export const coreSubjects = ['Urdu', 'Islamiyat', 'Pakistan Studies', 'English'];
export function subjectsForSection(wing: string, section: string): string[] {
  if (wing === 'primary') return ['Science', 'Urdu', 'English', 'Math', 'General Knowledge', 'Islamiyat'];
  if (section.startsWith('Pre-Engineering - ')) return ['Math', 'Chemistry', 'Physics', ...coreSubjects];
  if (section.startsWith('Medical - ')) return ['Biology', 'Chemistry', 'Physics', ...coreSubjects];
  if (section.startsWith('Humanities - ')) return ['Economics', 'Physics', ...coreSubjects];
  if (section.startsWith('Computer Science - ')) return ['Math', 'Computer Science', 'Physics', ...coreSubjects];
  return [];
}
export const schoolDate = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi' }).format(date);
export function attendanceStats(items: { status: string }[]) {
  const present = items.filter(item => item.status === 'present').length;
  const late = items.filter(item => item.status === 'late').length;
  return { present, late, absent: items.filter(item => item.status === 'absent').length, leave: items.filter(item => item.status === 'leave').length, total: items.length, percentage: items.length ? Math.round((present + late) / items.length * 100) : null };
}
