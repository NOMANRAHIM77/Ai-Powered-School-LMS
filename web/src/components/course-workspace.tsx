"use client";
import { useEffect, useRef, useState } from 'react';
import { AdminSmartSearch } from "./admin-smart-search";
import { CourseLearning } from './course-learning';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormModal } from '@/components/form-modal';
import { StudentAvatar } from '@/components/student-photo';
import { schoolStreams } from '@/components/admin-account-types';

type Stats = { present: number; late: number; absent: number; leave: number; total: number; percentage: number | null };
type Course = { _id: string; subjectName: string; wing: string; startDate?: string; classId: { _id: string; name: string }; sectionId: { _id: string; name: string }; teacherId?: { _id: string; userId?: { name: string; isActive: boolean; removedAt?: string } }; stats?: Stats };
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Karachi' }).format(new Date());
const selectStyle = 'h-11 rounded-md border bg-background px-3 text-sm';
const teacherName = (course: Course) => course.teacherId?.userId ? `${course.teacherId.userId.name}${course.teacherId.userId.isActive && !course.teacherId.userId.removedAt ? '' : ' (inactive)'}` : 'Teacher not assigned';
const sectionName = (course: Course) => course.sectionId?.name.split(' - ').pop() ?? '';

export function CourseWorkspace({ role, studentId }: { role: 'admin' | 'teacher' | 'student'; studentId?: string }) {
  const [items, setItems] = useState<Course[]>([]); const [teachers, setTeachers] = useState<any[]>([]);
  const [year, setYear] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [version, setVersion] = useState(0); const [search, setSearch] = useState(''); const [wing, setWing] = useState(''); const [classId, setClassId] = useState(''); const [page, setPage] = useState(1);
  const [smart, setSmart] = useState(''); const prepared = useRef<Promise<unknown>>();
  const [stream, setStream] = useState('');
  const [section, setSection] = useState('');
  const [selected, setSelected] = useState<Course | null>(null); const [startDate, setStartDate] = useState(''); const [teacherId, setTeacherId] = useState(''); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState('');
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    (async () => { try {
      if (role === 'admin') await (prepared.current ??= api.post('/courses/prepare').catch(e => { prepared.current = undefined; throw e; }));
      const { data } = await api.get('/courses', { params: { studentId, ...(smart ? { smart } : {}) } });
      if (live) { setItems(data.data.items); setTeachers(data.data.teachers); setYear(data.data.year); }
    } catch (err: any) { if (live) setError(err.response?.data?.message ?? 'Unable to load courses.'); }
    finally { if (live) setLoading(false); } })();
    return () => { live = false; };
  }, [role, version, studentId, smart]);
  const scopedCourses = items.filter(item => (!wing || item.wing === wing) && (!classId || item.classId?._id === classId) && (!stream || item.sectionId?.name.startsWith(`${stream} - `)));
  const availableSections = Array.from(new Set(scopedCourses.map(sectionName))).filter(Boolean).sort();
  const filtered = scopedCourses.filter(item => (!section || sectionName(item) === section) && `${item.subjectName} ${teacherName(item)} ${item.classId?.name} ${item.sectionId?.name}`.toLowerCase().includes(search.toLowerCase()));
  const availableStreams = schoolStreams.filter(name => items.some(item => (!wing || item.wing === wing) && (!classId || item.classId?._id === classId) && item.sectionId?.name.startsWith(`${name} - `)));
  const classes = Array.from(new Map(items.filter(item => !wing || item.wing === wing).map(item => [item.classId?._id, item.classId])).values()).filter(Boolean);
  const open = (course: Course) => { setSelected(course); setStartDate(course.startDate?.slice(0, 10) ?? ''); setTeacherId(course.teacherId?._id ?? ''); setFormError(''); };
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!selected || busy) return; setBusy(true); setFormError('');
    try { await api.patch(`/courses/${selected._id}`, { ...(startDate ? { startDate } : {}), teacherId: teacherId || null }); setSelected(null); setVersion(value => value + 1); }
    catch (err: any) { setFormError(err.response?.data?.message ?? 'Unable to save course.'); } finally { setBusy(false); }
  }
  if (selected && role !== 'admin' && !studentId) return <CourseLearning course={selected} role={role} onBack={() => setSelected(null)} />;
  return <section className="mt-7 space-y-5" aria-label="Courses and subject attendance">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{role === 'student' ? 'My subjects & attendance' : role === 'teacher' ? 'My courses & attendance' : 'Courses'}</h2><p className="mt-1 text-sm text-muted-foreground">{year}{year && ' · '}{role === 'admin' ? 'Assign teachers and set when attendance begins.' : 'Attendance is recorded separately for each subject. Present and late count as attended.'}</p></div><Button variant="outline" disabled={loading} onClick={() => setVersion(value => value + 1)}>Refresh</Button></div>
    {role === 'admin' && <AdminSmartSearch target="courses" value={smart} onApply={plan => { setSmart(plan); setSearch(''); setWing(''); setClassId(''); setStream(''); setSection(''); setPage(1); }} />}
    <details open={role !== 'admin'} className="space-y-3"><summary className="cursor-pointer text-sm font-medium">Manual search & filters</summary>
    <div className="flex flex-wrap gap-3">
      <Input className="min-w-48 flex-1" aria-label="Search subjects, teachers, classes or sections" placeholder="Search subject, teacher, class or section…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      {role !== 'student' && <>
        <select aria-label="Filter wing" className={selectStyle} value={wing} onChange={e => { setWing(e.target.value); setClassId(''); setStream(''); setSection(''); setPage(1); }}><option value="">All wings</option>{['primary', 'secondary', 'higher'].map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter class" className={selectStyle} value={classId} onChange={e => { setClassId(e.target.value); setStream(''); setSection(''); setPage(1); }}><option value="">All classes</option>{classes.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select>
      </>}
      {role === 'admin' && <>
        <select aria-label="Filter stream" className={selectStyle} value={stream} disabled={loading || !availableStreams.length} onChange={e => { setStream(e.target.value); setSection(''); setPage(1); }}><option value="">{!loading && !availableStreams.length ? 'No streams available' : 'All streams'}</option>{availableStreams.map(name => <option value={name} key={name}>{name}</option>)}</select>
        <select aria-label="Filter section" className={selectStyle} value={section} disabled={loading || !availableSections.length} onChange={e => { setSection(e.target.value); setPage(1); }}><option value="">All sections</option>{availableSections.map(name => <option value={name} key={name}>Section {name}</option>)}</select>
      </>}
    </div>
    </details>
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-destructive">{error}</p>}
    {loading ? <p role="status">Loading courses…</p> : !error && <><p className="text-xs text-muted-foreground">{filtered.length} course(s)</p><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.slice((page - 1) * 12, page * 12).map(course => <Card key={course._id} className="flex flex-col gap-3 p-5"><div className="flex justify-between gap-3"><h3 className="font-display text-lg font-bold">{course.subjectName}</h3><span className="text-xs capitalize text-muted-foreground">{course.wing}</span></div><p className="text-sm">{teacherName(course)}</p><p className="text-xs text-muted-foreground">{course.classId?.name} · {course.sectionId?.name}</p><p className="text-xs text-muted-foreground">{course.startDate ? `Starts ${course.startDate.slice(0, 10)}` : 'Start date not assigned'}</p>{course.stats && <div className="rounded-lg bg-muted/40 p-3"><strong className="text-xl">{course.stats.percentage === null ? '—' : `${course.stats.percentage}%`}</strong><p className="mt-1 text-xs text-muted-foreground">{course.stats.present + course.stats.late} attended / {course.stats.total} marked · {course.stats.absent} absent · {course.stats.leave} leave</p></div>}<Button className="mt-auto" variant="outline" onClick={() => open(course)}>{role === 'admin' ? 'Manage course' : role === 'teacher' ? 'Open course' : studentId ? 'View attendance' : 'Open course'}</Button></Card>)}</div>{!filtered.length && <Card className="p-6 text-sm text-muted-foreground">No courses match. {role === 'student' ? 'Your courses appear after enrollment in a current-year section.' : role === 'teacher' ? 'Ask the admin to assign your subjects and sections.' : 'Add classes and sections for the current academic year.'}</Card>}{filtered.length > 12 && <div className="flex items-center justify-between"><Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm">{page} / {Math.ceil(filtered.length / 12)}</span><Button variant="outline" disabled={page * 12 >= filtered.length} onClick={() => setPage(value => value + 1)}>Next</Button></div>}</>}
    {selected && role === 'admin' && <FormModal title={`${selected.subjectName} · ${selected.classId?.name}`} description={selected.sectionId?.name ?? ''} formId="course-settings" submitLabel={busy ? 'Saving…' : 'Save course'} busy={busy} error={formError} onClose={() => setSelected(null)}><form id="course-settings" onSubmit={save} className="space-y-5"><label className="grid gap-2 text-sm font-semibold">Teacher<select className={selectStyle} value={teacherId} onChange={e => setTeacherId(e.target.value)}><option value="">Not assigned</option>{teachers.filter(teacher => teacher.sectionIds?.includes(selected.sectionId._id)).map(teacher => <option value={teacher._id} key={teacher._id}>{teacher.userId.name}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Course start date<Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><p className="text-xs text-muted-foreground">Attendance stays closed until a start date is assigned. Once attendance is recorded, the start date is locked.</p></form></FormModal>}
    {selected && role !== 'admin' && <CourseAttendancePanel key={selected._id} course={selected} role={role} studentId={studentId} onClose={() => { setSelected(null); setVersion(value => value + 1); }} />}
  </section>;
}

export function CourseAttendancePanel({ course, role, studentId, onClose }: { course: Course; role: 'teacher' | 'student'; studentId?: string; onClose: () => void }) {
  const [date, setDate] = useState(today()); const [data, setData] = useState<any>(null); const [records, setRecords] = useState<Record<string, string>>({}); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { let live = true; setLoading(true); setData(null); setRecords({}); setError(''); setMessage(''); api.get(`/courses/${course._id}/attendance`, { params: role === 'teacher' ? { date } : { studentId } }).then(({ data: response }) => { if (live) { setData(response.data); setRecords(Object.fromEntries((response.data.records ?? []).map((item: any) => [item.studentId, item.status]))); } }).catch(err => { if (live) setError(err.response?.data?.message ?? 'Unable to load attendance.'); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [course._id, role, date, studentId]);
  const enabled = role === 'teacher' && !!course.startDate && date >= course.startDate.slice(0, 10) && date <= today() && !loading && !error && data?.students?.length > 0;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (role === 'student') { onClose(); return; } if (!enabled || busy) return;
    const students: any[] = data.students;
    if (students.some(student => !records[student._id])) { setMessage('Select a status for every student.'); return; }
    setBusy(true); setMessage('');
    try { await api.put(`/courses/${course._id}/attendance`, { date, records: students.map(student => ({ studentId: student._id, status: records[student._id] })) }); setMessage('Attendance saved.'); }
    catch (err: any) { setMessage(err.response?.data?.message ?? 'Unable to save attendance.'); } finally { setBusy(false); }
  }
  return <FormModal title={`${course.subjectName} attendance`} description={`${course.classId?.name} · ${course.sectionId?.name} · ${teacherName(course)}`} formId="course-attendance" submitLabel={role === 'student' ? 'Done' : busy ? 'Saving…' : 'Save attendance'} busy={busy} submitDisabled={loading || (role === "teacher" && !enabled)} error={error} onClose={onClose}><form id="course-attendance" onSubmit={submit} className="space-y-4">
    {role === 'teacher' && <label className="grid gap-2 text-sm font-semibold">Attendance date<Input type="date" required min={course.startDate?.slice(0, 10)} max={today()} value={date} disabled={busy} onChange={e => { if (e.target.value) setDate(e.target.value); }} /></label>}
    {!course.startDate && <p className="text-sm text-muted-foreground">The admin has not assigned a start date yet.</p>}
    {loading ? <p role="status">Loading attendance…</p> : role === 'student' ? <div className="space-y-2">{data?.items?.length ? data.items.map((item: any) => <div key={item.date} className="flex justify-between border-b py-3 text-sm"><span>{item.date.slice(0, 10)}</span><strong className="capitalize">{item.status}</strong></div>) : <p className="text-sm text-muted-foreground">No attendance has been marked for you in this subject.</p>}</div> : <fieldset disabled={!enabled || busy} className="space-y-3"><Button type="button" variant="outline" onClick={() => setRecords(Object.fromEntries(data.students.map((student: any) => [student._id, 'present'])))}>Mark all present</Button>{data?.students?.map((student: any) => <label key={student._id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><StudentAvatar name={student.userId.name} photo={student.photo} className="size-10" /><span className="min-w-32 flex-1 text-sm">{student.userId.name}<span className="block text-xs text-muted-foreground">{student.admissionNo}</span></span><select required aria-label={`Attendance for ${student.userId.name}`} className={selectStyle} value={records[student._id] ?? ''} onChange={e => setRecords(current => ({ ...current, [student._id]: e.target.value }))}><option value="">Select status</option>{['present', 'absent', 'late', 'leave'].map(status => <option key={status}>{status}</option>)}</select></label>)}{!data?.students?.length && <p className="text-sm">No eligible students enrolled on this date.</p>}</fieldset>}
    {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{message}</p>}
  </form></FormModal>;
}


