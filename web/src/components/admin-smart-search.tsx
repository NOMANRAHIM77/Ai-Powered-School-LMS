"use client";
import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
type Target = 'courses' | 'student' | 'teacher' | 'parent' | 'admin';
const examples: Record<Target, string[]> = {
  courses: ['Show courses taught by Ahmed', 'Show courses for class 11 CS section A', 'Show primary wing Math courses'],
  student: ['Show students with attendance below 70 percent', 'Show female students in class 8 section B', 'Show disabled student accounts'],
  teacher: ['Show teachers teaching Physics', 'Show teachers in higher wing section A', 'Show disabled teacher accounts'],
  parent: ['Show parents of student Ali', 'Show parents of students in class 8 section B', 'Show disabled parent accounts'],
  admin: ['Show active admin accounts', 'Show admin named Ahmed'],
};
export function AdminSmartSearch({ target, value, onApply }: { target: Target; value: string; onApply: (plan: string) => void }) {
  const [query, setQuery] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [summary, setSummary] = useState('');
  const controller = useRef<AbortController>(); const request = useRef(0);
  useEffect(() => () => { request.current++; controller.current?.abort(); }, []);
  useEffect(() => { if (!value) setSummary(''); }, [value]);
  async function search(e: React.FormEvent) {
    e.preventDefault(); if (!query.trim() || busy) return;
    const current = ++request.current; controller.current?.abort(); controller.current = new AbortController(); setBusy(true); setError('');
    try {
      const { data } = await api.post('/admin/search/interpret', { target, query: query.trim() }, { timeout: 60000, signal: controller.current.signal });
      if (current !== request.current) return;
      setSummary(data.data.summary); onApply(JSON.stringify(data.data.plan));
    } catch (e: any) { if (current === request.current) setError(e.response?.data?.message ?? 'AI search could not connect. Please retry or use manual filters.'); }
    finally { if (current === request.current) setBusy(false); }
  }
  function clear() { request.current++; controller.current?.abort(); setBusy(false); setQuery(''); setSummary(''); setError(''); onApply(''); }
  let attendance = false; try { attendance = Boolean(value && JSON.parse(value).filters?.attendance); } catch { /* Validated by the server. */ }
  return <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />Search in your own words</div>
    <form onSubmit={search} className="flex flex-wrap gap-2"><label className="min-w-48 flex-1"><span className="sr-only">Describe which {target === 'courses' ? 'courses' : `${target} accounts`} to show</span><Input className="h-11 bg-background" maxLength={600} minLength={2} required placeholder={examples[target][0]} value={query} onChange={e => setQuery(e.target.value)} disabled={busy} /></label><Button className="h-11" disabled={busy || query.trim().length < 2}><Search className="size-4" />{busy ? 'Understanding…' : 'Search'}</Button>{(value || query || busy) && <Button type="button" variant="outline" className="h-11" onClick={clear}><X className="size-4" />Clear</Button>}</form>
    <div className="flex flex-wrap gap-2">{examples[target].map(example => <button type="button" key={example} disabled={busy} className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-50" onClick={() => setQuery(example)}>{example}</button>)}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}{value && ' Your previous search is still applied.'}</p>}
    {value && <div role="status" className="space-y-1 rounded-lg bg-background p-3 text-sm"><p><strong>Applied: </strong>{summary || 'Your natural-language search'}</p><p className="text-xs text-muted-foreground">Name matches may include more than one person. Manual filters can narrow these results further.</p>{attendance && <p className="text-xs text-muted-foreground">Attendance = (present + late) ÷ recorded subject sessions. Absent and leave count in the total. Unrecorded sessions and students with no records are excluded. Comparisons use the exact percentage.</p>}</div>}
    {!value && <p className="text-xs text-muted-foreground">Describe the people or courses to show, then press Search. This search only filters records.</p>}
  </div>;
}
