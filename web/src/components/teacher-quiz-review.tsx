"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FormModal } from './form-modal';
const field = 'w-full rounded-lg border bg-background p-3 text-sm';
const failure = (e: any) => e.response?.data?.message ?? 'Unable to load or save the review. Please retry.';
const stateLabel = (w: any) => !w.submittedAt ? 'In progress' : ({ queued: 'Queued for checking', grading: 'Checking answers', review: 'Awaiting approval', error: 'Needs teacher attention', approved: 'Approved' } as any)[w.quizReviewStatus] ?? 'Awaiting checking';

export function TeacherQuizReview({ activityId, onClose }: { activityId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(); const [error, setError] = useState(''); const [selected, setSelected] = useState('');
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [scheme, setScheme] = useState(false);
  async function refresh() { try { const r = await api.get(`/course-learning/activities/${activityId}/reviews`); setData(r.data.data); setError(''); } catch (e) { setError(failure(e)); } }
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 10000); return () => clearInterval(timer); }, [activityId]);
  const current = data?.works.find((w: any) => w._id === selected);
  const filtered = data?.works.filter((w: any) => `${w.studentId?.userId?.name ?? ''} ${w.studentId?.studentCode ?? ''}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'pending' ? w.submittedAt && w.quizReviewStatus !== 'approved' : w.quizReviewStatus === 'approved')));
  return <FormModal title={data?.activity.title ?? 'Quiz review'} description="Review automatic marks, make corrections, then approve publication to students." formId="close-quiz-review" submitLabel="Done" onClose={onClose} error={error}>
    <form id="close-quiz-review" onSubmit={e => { e.preventDefault(); onClose(); }} />
    {!data ? <Button variant="outline" onClick={refresh}>Loading review… Retry</Button> : <div className="space-y-5">
      <div className="flex flex-wrap gap-3 text-sm"><span className="rounded border px-3 py-2">{data.works.filter((w: any) => w.submittedAt).length} submitted</span><span className="rounded border px-3 py-2">{data.works.filter((w: any) => w.submittedAt && w.quizReviewStatus !== 'approved').length} awaiting approval</span><span className="rounded border px-3 py-2">{data.works.filter((w: any) => w.quizReviewStatus === 'approved').length} approved</span></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={refresh}>Refresh</Button>{data.activity.quizType === 'written' && <Button variant="outline" onClick={() => setScheme(v => !v)}>{scheme ? 'Hide marking scheme' : 'Marking scheme'}</Button>}</div>
      {scheme && <MarkingScheme key={data.activity.updatedAt} activity={data.activity} locked={data.works.some((w: any) => w.quizReviewStatus === 'approved')} onSaved={() => { setScheme(false); void refresh(); }} />}
      <div className="flex flex-wrap gap-2"><Input className="min-w-44 flex-1" placeholder="Find student by name or ID…" aria-label="Search quiz attempts" value={search} onChange={e => setSearch(e.target.value)} /><select className={field + ' sm:w-auto'} aria-label="Filter approval status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All attempts</option><option value="pending">Awaiting approval</option><option value="approved">Approved</option></select></div>
      <div className="max-h-56 space-y-2 overflow-y-auto">{filtered.map((w: any) => <button type="button" key={w._id} onClick={() => setSelected(w._id)} className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left ${selected === w._id ? 'border-primary bg-primary/5' : ''}`}><span><span className="block text-sm font-semibold">{w.studentId?.userId?.name ?? 'Student'}</span><span className="text-xs text-muted-foreground">{w.studentId?.studentCode} {w.missed ? '· Not attempted' : w.autoSubmitted ? '· Time expired' : ''}</span></span><span className="text-right text-xs"><span className="block font-medium">{stateLabel(w)}</span>{w.aiTotal !== undefined && <span className="block">Suggested: {w.aiTotal}/{data.activity.maxMarks}</span>}{w.quizReviewStatus === 'approved' && <span className="block">Final: {w.grade}/{data.activity.maxMarks}</span>}</span></button>)}{!filtered.length && <p className="rounded border border-dashed p-5 text-sm text-muted-foreground">No matching attempts. Submitted and timed-out quizzes appear here automatically.</p>}</div>
      {current ? <AttemptReview key={current._id} activity={data.activity} work={current} onSaved={refresh} /> : <p className="text-sm text-muted-foreground">Choose a student to open their answers and marking details.</p>}
    </div>}
  </FormModal>;
}

function MarkingScheme({ activity, locked, onSaved }: any) {
  const [questions, setQuestions] = useState(activity.questions.map((q: any) => ({ referenceAnswer: q.referenceAnswer ?? '', rubric: q.rubric ?? '' })));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <form className="space-y-4 rounded-xl border p-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await api.patch(`/course-learning/activities/${activity._id}/marking-scheme`, { questions }); onSaved(); } catch (e) { setError(failure(e)); } finally { setBusy(false); } }}><p className="text-sm">Reference answers and criteria are private to teachers. Saving rechecks unapproved submissions.</p>{locked && <p className="text-sm">This marking scheme is locked because marks have already been approved. Individual marks can still be reviewed.</p>}<fieldset disabled={busy || locked} className="space-y-4">{activity.questions.map((q: any, i: number) => <div className="space-y-2" key={i}><p className="text-sm font-semibold">{i + 1}. {q.prompt} · {q.marks} marks</p><label className="grid gap-1 text-sm">Reference answer<textarea className={field} required maxLength={5000} value={questions[i].referenceAnswer} onChange={e => setQuestions((rows: any[]) => rows.map((r, n) => n === i ? { ...r, referenceAnswer: e.target.value } : r))} /></label><label className="grid gap-1 text-sm">Marking criteria (optional)<textarea className={field} maxLength={2000} value={questions[i].rubric} onChange={e => setQuestions((rows: any[]) => rows.map((r, n) => n === i ? { ...r, rubric: e.target.value } : r))} /></label></div>)}<Button>{busy ? 'Saving…' : 'Save scheme & recheck'}</Button></fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>;
}
function initialResults(activity: any, work: any) {
  const source = work.draftResults?.length ? work.draftResults : work.teacherResults?.length ? work.teacherResults : work.aiResults ?? [];
  return activity.questions.map((_: any, i: number) => ({ index: i, marks: source.find((r: any) => r.index === i)?.marks ?? '', feedback: source.find((r: any) => r.index === i)?.feedback ?? '' }));
}
function AttemptReview({ activity, work, onSaved }: any) {
  const [results, setResults] = useState(() => initialResults(activity, work)); const [feedback, setFeedback] = useState(work.reviewFeedback ?? work.feedback ?? '');
  const [version, setVersion] = useState(work.reviewVersion ?? 0); const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (!dirty && !busy) { setResults(initialResults(activity, work)); setFeedback(work.reviewFeedback ?? work.feedback ?? ''); setVersion(work.reviewVersion ?? 0); } }, [work.reviewVersion, work.quizReviewStatus, dirty, busy]);
  const stale = version !== (work.reviewVersion ?? 0);
  const total = Math.round(results.reduce((sum: number, r: any) => sum + Number(r.marks || 0), 0) * 100) / 100;
  const valid = results.every((r: any, i: number) => r.marks !== '' && Number.isFinite(Number(r.marks)) && Number(r.marks) >= 0 && Number(r.marks) <= activity.questions[i].marks);
  function edit(i: number, key: string, value: string) { setDirty(true); setMessage(''); setResults((rows: any[]) => rows.map((r, n) => n === i ? { ...r, [key]: value } : r)); }
  async function save(action: 'draft' | 'approve') {
    setBusy(true); setError(''); setMessage('');
    try { const r = await api.patch(`/course-learning/activities/${activity._id}/reviews/${work._id}`, { action, version, results: results.map((r: any) => ({ ...r, marks: Number(r.marks) })), feedback }); setVersion(r.data.data.reviewVersion); setDirty(false); setMessage(action === 'approve' ? 'Final marks approved and published to the student.' : 'Draft saved. No new marks were published.'); await onSaved(); }
    catch (e) { setError(failure(e)); } finally { setBusy(false); }
  }
  async function retry() { setBusy(true); setError(''); try { await api.post(`/course-learning/activities/${activity._id}/reviews/${work._id}/retry`); await onSaved(); } catch (e) { setError(failure(e)); } finally { setBusy(false); } }
  return <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
    <header><h3 className="text-lg font-bold">{work.studentId?.userId?.name ?? 'Student'} · Quiz review</h3><p className="text-sm text-muted-foreground">{stateLabel(work)}{work.approvedAt && ` · Approved ${new Date(work.approvedAt).toLocaleString()}`}</p></header>
    {!work.submittedAt ? <p>This attempt is still in progress. Marks can be reviewed after submission or expiry.</p> : <>
      {['queued', 'grading'].includes(work.quizReviewStatus) && <p role="status" className="text-sm">Automatic checking is in progress. This screen refreshes automatically.</p>}
      {work.aiError && <div className="space-y-2 rounded border p-3"><p className="text-sm">{work.aiError} You can also mark every question manually.</p><Button variant="outline" disabled={busy} onClick={retry}>Retry automatic checking</Button></div>}
      {stale && dirty && <p role="alert" className="text-sm text-destructive">The review changed while you were editing. <button className="underline" onClick={() => { setDirty(false); setError(''); }}>Reload the latest review</button> before saving.</p>}
      <div className="flex flex-wrap gap-4 rounded-lg bg-background p-4"><div><p className="text-xs text-muted-foreground">Automatic suggestion</p><strong>{work.aiTotal ?? 'Pending'} / {activity.maxMarks}</strong></div><div><p className="text-xs text-muted-foreground">Your reviewed total</p><strong>{total} / {activity.maxMarks}</strong></div><div><p className="text-xs text-muted-foreground">Marks deducted</p><strong>{Math.round((activity.maxMarks - total) * 100) / 100}</strong></div></div>
      <fieldset disabled={busy} className="space-y-4">{activity.questions.map((q: any, i: number) => {
        const suggested = work.aiResults?.find((r: any) => r.index === i); const answer = work.answers?.[i] ?? '';
        const verdict = !answer.trim() ? 'Unanswered' : !suggested ? 'Not checked' : suggested.marks === 0 ? 'Wrong' : suggested.marks < q.marks ? 'Partial credit' : 'Correct';
        return <article className="space-y-3 rounded-xl border bg-background p-4" key={i}><div className="flex justify-between gap-3"><h4 className="text-sm font-semibold">{i + 1}. {q.prompt}</h4><span className={`whitespace-nowrap rounded px-2 py-1 text-xs ${verdict === 'Correct' ? 'bg-success-soft text-success' : verdict === 'Wrong' || verdict === 'Unanswered' ? 'bg-danger-soft text-destructive' : 'bg-muted'}`}>{verdict}</span></div><p className="whitespace-pre-wrap text-sm"><strong>Student answer: </strong>{answer === '' ? 'Unanswered' : activity.quizType === 'mcq' ? q.options[Number(answer)] : answer}</p><p className="whitespace-pre-wrap text-sm"><strong>Expected: </strong>{activity.quizType === 'mcq' ? q.options[q.correct] : q.referenceAnswer || 'Reference answer not set'}</p>{q.rubric && <p className="text-xs text-muted-foreground">Criteria: {q.rubric}</p>}{suggested && <div className="rounded bg-muted/50 p-3 text-sm"><p className="font-semibold">Suggested {suggested.marks}/{q.marks} · {Math.round((q.marks - suggested.marks) * 100) / 100} deducted</p><p className="mt-1 whitespace-pre-wrap">{suggested.feedback}</p></div>}<label className="grid gap-1 text-sm">Reviewed marks (maximum {q.marks})<Input type="number" step="0.01" min={0} max={q.marks} required value={results[i].marks} onChange={e => edit(i, 'marks', e.target.value)} /></label><label className="grid gap-1 text-sm">Feedback to publish<textarea className={field} maxLength={2000} value={results[i].feedback} onChange={e => edit(i, 'feedback', e.target.value)} /></label></article>;
      })}<label className="grid gap-2 text-sm">Overall feedback<textarea className={field} maxLength={3000} value={feedback} onChange={e => { setDirty(true); setFeedback(e.target.value); }} /></label></fieldset>
      <p className="text-xs text-muted-foreground">Check every suggested mark before approving. Save draft keeps edits private; Approve & publish makes the reviewed marks visible in the student's grades.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !valid || stale} onClick={() => save('draft')}>Save draft</Button><Button disabled={busy || !valid || stale} onClick={() => save('approve')}>{busy ? 'Saving…' : work.quizReviewStatus === 'approved' ? 'Approve & publish changes' : 'Approve & publish final marks'}</Button></div>
    </>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-success">{message}</p>}
  </section>;
}
