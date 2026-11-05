"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CourseWorkspace } from './course-workspace';
import { StudentAvatar } from './student-photo';
export function ParentWorkspace() {
  const [children, setChildren] = useState<any[]>([]); const [selected, setSelected] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { let live = true; api.get('/parent/children').then(({ data }) => { if (live) { setChildren(data.data.items); setSelected(data.data.items[0]?._id ?? ''); } }).catch(e => { if (live) setError(e.response?.data?.message ?? 'Unable to load children'); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, []);
  const child = children.find(c => c._id === selected);
  return <div className="space-y-5"><h1 className="text-2xl font-bold">My children</h1>{error && <p role="alert">{error}</p>}{loading ? <p>Loading linked children…</p> : !children.length && <p>No active student is linked to your account. Ask the admin to check your student ID.</p>}{children.length > 1 && <label className="grid gap-2">Select child<select className="rounded border bg-background p-3" value={selected} onChange={e => setSelected(e.target.value)}>{children.map(c => <option key={c._id} value={c._id}>{c.userId.name} · {c.studentCode}</option>)}</select></label>}{child && <><div className="flex items-center gap-4 rounded-xl border bg-card p-5"><StudentAvatar name={child.userId.name} photo={child.photo} className="size-20" /><div><h2 className="text-xl font-semibold">{child.userId.name}</h2><p className="text-sm">Student ID: {child.studentCode ?? 'Pending assignment'}</p><p className="text-sm">{child.enrollment?.sectionId?.classId?.name} · {child.enrollment?.sectionId?.name}</p><p className="text-sm">Parent: {child.parentName || '—'} · {child.parentPhone || '—'}</p></div></div><CourseWorkspace key={child._id} role="student" studentId={child._id} /></>}</div>;
}
