"use client";
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

const field = 'w-full rounded-lg border bg-background p-3 text-sm';
const failure = (e: any) => e.response?.data?.message ?? 'Could not connect. Your saved progress is safe. Please retry.';
const kindName = (kind: string) => kind === 'mcq' ? 'MCQs' : kind === 'written' ? 'Short answers' : 'Flashcards';
const when = (v: string) => new Date(v).toLocaleString();
const base = (courseId: string) => `/personalized-quizzes/${courseId}`;

export function PersonalizedQuiz({ courseId }: { courseId: string }) {
  const [data, setData] = useState<any>(); const [error, setError] = useState(''); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]); const [search, setSearch] = useState('');
  const [kind, setKind] = useState('mcq'); const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5); const [minutes, setMinutes] = useState(10); const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<any>();
  async function refresh() { try { const r = await api.get(base(courseId), { params: { page } }); setData(r.data.data); } catch (e) { setError(failure(e)); } }
  useEffect(() => { void refresh(); }, [courseId, page]);
  useEffect(() => { if (opened || !data?.history.some((q: any) => q.kind !== 'flashcards' && ['active', 'grading'].includes(q.status))) return; const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer); }, [data, opened]);
  async function generate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const r = await api.post(`${base(courseId)}/generate`, { materialIds: selected, kind, difficulty, count, durationMinutes: minutes }, { timeout: 600000 }); setOpened(r.data.data); void refresh(); }
    catch (e) { setError(failure(e)); } finally { setBusy(false); }
  }
  async function open(id: string) { setBusy(true); setError(''); try { const r = await api.get(`${base(courseId)}/${id}`, { timeout: 120000 }); setOpened(r.data.data); } catch (e) { setError(failure(e)); } finally { setBusy(false); } }
  if (opened) return <PracticeAttempt key={opened.quiz._id} courseId={courseId} initial={opened} onBack={() => { setOpened(undefined); void refresh(); }} />;
  const totals = (data?.totals ?? []).filter((t: any) => t._id !== 'flashcards');
  const generated = totals.reduce((n: number, t: any) => n + t.generated, 0), attempted = totals.reduce((n: number, t: any) => n + t.attempted, 0), completed = totals.reduce((n: number, t: any) => n + t.completed, 0);
  const average = completed ? Math.round(totals.reduce((n: number, t: any) => n + (t.average ?? 0) * t.completed, 0) / completed) : 0;
  const best = Math.max(0, ...totals.map((t: any) => t.best ?? 0));
  return <div className="space-y-6">
    <header className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Your practice space</p><h3 className="mt-2 text-2xl font-bold">Personalized quiz</h3><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Turn your course lessons into a timed quiz or flashcards. Choose what to practise, then review your answers and progress.</p></header>
    {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm">{error}</p>}
    {!data ? <Button variant="outline" onClick={refresh}>Loading practice… Retry</Button> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Quizzes generated', generated], ['Attempted / completed', `${attempted} / ${completed}`], ['Average score', completed ? `${average}%` : '—'], ['Best score', completed ? `${best}%` : '—']].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
      <form onSubmit={generate} className="rounded-xl border bg-card p-5 sm:p-6"><fieldset disabled={busy || !data.configured} className="space-y-5">
        <div><h4 className="text-lg font-semibold">Build your practice</h4><p className="text-sm text-muted-foreground">Select up to three lessons. New readable materials are prepared automatically.</p></div>
        {!data.configured && <p role="alert">The administrator needs to configure the AI service first.</p>}
        <Input aria-label="Search course materials" placeholder="Search lesson or file name…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-64 space-y-2 overflow-y-auto">{data.materials.filter((m: any) => `${m.title} ${m.attachments.map((a: any) => a.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map((m: any) => <label key={m._id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected.includes(m._id) ? 'border-primary bg-primary/5' : ''}`}><input className="mt-1" type="checkbox" checked={selected.includes(m._id)} disabled={!selected.includes(m._id) && selected.length >= 3} onChange={e => setSelected(ids => e.target.checked ? [...ids, m._id] : ids.filter(id => id !== m._id))} /><span><span className="block text-sm font-semibold">{m.title}</span><span className="text-xs text-muted-foreground">{m.attachments.map((a: any) => a.name).join(' · ') || 'Lesson notes'}</span></span></label>)}{!data.materials.length && <p className="p-4 text-sm text-muted-foreground">Your teacher has not uploaded any lessons for this course yet.</p>}{data.materials.length > 0 && !data.materials.some((m: any) => `${m.title} ${m.attachments.map((a: any) => a.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())) && <p>No lessons match your search.</p>}</div>
        <p className="text-xs text-muted-foreground">{selected.length} / 3 lessons selected</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">Practice type<select className={field} value={kind} onChange={e => setKind(e.target.value)}><option value="mcq">Multiple choice</option><option value="written">Short-answer questions</option><option value="flashcards">Flashcards</option></select></label>
          <label className="grid gap-2 text-sm font-medium">Difficulty<select className={field} value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="easy">Easy · recall</option><option value="medium">Medium · understanding</option><option value="hard">Hard · application</option></select></label>
          <label className="grid gap-2 text-sm font-medium">Number of {kind === 'flashcards' ? 'cards' : 'questions'}<Input required type="number" min={1} max={15} value={count} onChange={e => setCount(Number(e.target.value))} /></label>
          {kind !== 'flashcards' && <label className="grid gap-2 text-sm font-medium">Timer (minutes)<Input required type="number" min={1} max={60} value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label>}
        </div>
        <div className="flex flex-wrap items-center gap-3"><Button disabled={busy || !selected.length || !data.configured}>{busy ? 'Preparing lessons and generating…' : kind === 'flashcards' ? 'Generate flashcards' : 'Generate quiz'}</Button><p className="text-xs text-muted-foreground">{kind === 'flashcards' ? 'Reveal answers and track the cards you know.' : 'The timer starts when you press Start quiz.'}</p></div>
        {busy && <p role="status" className="text-sm">This may take a minute, or longer when preparing a new PDF. Keep this page open.</p>}
      </fieldset></form>
      <section className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-lg font-semibold">Practice history</h4><Button variant="ghost" disabled={busy} onClick={refresh}>Refresh</Button></div><p className="text-sm text-muted-foreground">{completed} of {generated} generated quizzes completed · {data.totals.find((t: any) => t._id === 'flashcards')?.generated ?? 0} flashcard decks</p><progress className="h-2 w-full accent-primary" aria-label="Quiz completion progress" max={generated || 1} value={completed} />
        {data.history.map((q: any) => <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4" key={q._id}><div className="min-w-0 flex-1"><p className="font-semibold">{q.materials.map((m: any) => m.title).join(' + ')}</p><p className="mt-1 text-xs text-muted-foreground">{kindName(q.kind)} · {q.questionCount} {q.kind === 'flashcards' ? 'cards' : 'questions'} · {q.difficulty}{q.kind !== 'flashcards' && ` · ${q.durationMinutes} min`} · {when(q.createdAt)}</p><p className="mt-2 text-sm">{q.kind === 'flashcards' ? `${q.mastered.length} / ${q.questionCount} mastered` : q.status === 'completed' ? `${q.score} / ${q.questionCount} · ${q.percentage}%` : q.status === 'grading' ? 'Submitted · grading' : q.status === 'active' ? 'In progress · timer continues' : 'Ready to start'}</p></div><Button variant="outline" disabled={busy} onClick={() => open(q._id)}>{q.kind === 'flashcards' ? 'Study cards' : q.status === 'completed' ? 'View results' : q.status === 'ready' ? 'Open quiz' : 'Resume / results'}</Button></article>)}
        {!data.history.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Your generated quizzes and flashcards will appear here.</div>}
        {data.pages > 1 && <div className="flex items-center justify-between"><Button variant="outline" disabled={page <= 1 || busy} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-sm">Page {page} of {data.pages}</span><Button variant="outline" disabled={page >= data.pages || busy} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
      </section><p className="text-xs text-muted-foreground">AI practice results help you revise and do not change your teacher-assigned course marks. Short answers receive AI feedback and may take a few seconds to grade.</p>
    </>}
  </div>;
}

function Evidence({ source }: { source: any }) { return source ? <details className="mt-3 rounded-lg border p-3 text-sm"><summary className="cursor-pointer">Source: {source.title}{source.page ? ` · page ${source.page}` : ''}</summary><blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground">{source.quote}</blockquote></details> : null; }

function PracticeAttempt({ courseId, initial, onBack }: { courseId: string; initial: any; onBack: () => void }) {
  const [quiz, setQuiz] = useState(initial.quiz); const [answers, setAnswers] = useState<string[]>(initial.quiz.answers);
  const answerRef = useRef<string[]>(initial.quiz.answers); const version = useRef(initial.quiz.draftVersion ?? 0);
  const [offset, setOffset] = useState(Date.parse(initial.serverNow) - Date.now()); const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState('All answers saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(); const queue = useRef<Promise<void>>(Promise.resolve());
  const fetching = useRef(false); const lastCheck = useRef(0); const [card, setCard] = useState(0); const [revealed, setRevealed] = useState(false);
  const endpoint = `${base(courseId)}/${quiz._id}`;
  const seconds = quiz.deadline ? Math.max(0, Math.ceil((Date.parse(quiz.deadline) - now - offset) / 1000)) : 0;
  const expired = quiz.status === 'active' && quiz.kind !== 'flashcards' && seconds <= 0;
  function receive(payload: any) { setQuiz(payload.quiz); setOffset(Date.parse(payload.serverNow) - Date.now()); }
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => { clearInterval(timer); if (saveTimer.current) clearTimeout(saveTimer.current); }; }, []);
  async function check() {
    if (fetching.current) return; fetching.current = true; lastCheck.current = Date.now();
    try { const r = await api.get(endpoint, { timeout: 120000 }); receive(r.data.data); setError(''); } catch (e) { setError(failure(e)); } finally { fetching.current = false; }
  }
  useEffect(() => { if ((expired || quiz.status === 'grading') && !busy && Date.now() - lastCheck.current > 5000) void check(); }, [expired, quiz.status, now, busy]);
  function save(values = answerRef.current) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const next = ++version.current; setSaved('Saving answers…');
    queue.current = queue.current.then(async () => {
      try { await api.put(`${endpoint}/draft`, { answers: values, version: next }, { timeout: 10000 }); if (next === version.current) setSaved('All answers saved'); }
      catch { setSaved('Answers could not be saved. Reconnect and retry before time runs out.'); }
    });
  }
  function answer(index: number, value: string) {
    const next = answerRef.current.map((a, i) => i === index ? value : a); answerRef.current = next; setAnswers(next); setSaved('Saving answers…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (quiz.kind === 'mcq') save(next); else saveTimer.current = setTimeout(() => save(next), 350);
  }
  async function start() { setBusy(true); setError(''); try { const r = await api.post(`${endpoint}/start`); receive(r.data.data); setAnswers(r.data.data.quiz.answers); answerRef.current = r.data.data.quiz.answers; version.current = r.data.data.quiz.draftVersion; } catch (e) { setError(failure(e)); } finally { setBusy(false); } }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); if (saveTimer.current) clearTimeout(saveTimer.current);
    try { const r = await api.post(`${endpoint}/submit`, { answers: answerRef.current }, { timeout: 120000 }); receive(r.data.data); } catch (e) { setError(failure(e)); } finally { setBusy(false); }
  }
  async function markCard(known: boolean) { setBusy(true); setError(''); try { const mastered = known ? Array.from(new Set([...quiz.mastered, card])) : quiz.mastered.filter((i: number) => i !== card); const r = await api.put(`${endpoint}/cards`, { mastered }); receive(r.data.data); } catch (e) { setError(failure(e)); } finally { setBusy(false); } }
  return <section className="space-y-5">
    <Button variant="outline" disabled={busy} onClick={() => { if (quiz.status === 'active' && quiz.kind !== 'flashcards' && !expired) save(); onBack(); }}>← Practice history</Button>
    <header><h3 className="text-xl font-bold">{kindName(quiz.kind)} · {quiz.difficulty}</h3><p className="text-sm text-muted-foreground">{quiz.materials.map((m: any) => m.title).join(' + ')}</p></header>
    {error && <p role="alert" className="rounded border border-destructive p-3">{error}</p>}
    {quiz.kind === 'flashcards' ? <>
      <div className="flex justify-between text-sm"><span>Card {card + 1} of {quiz.questionCount}</span><span>{quiz.mastered.length} mastered</span></div><progress className="h-2 w-full accent-primary" aria-label="Flashcard mastery" max={quiz.questionCount} value={quiz.mastered.length} />
      <article className="space-y-5 rounded-2xl border bg-primary/5 p-6 sm:p-10"><p className="text-xs font-semibold uppercase tracking-widest">{quiz.mastered.includes(card) ? 'Mastered' : 'Recall the answer'}</p><h4 className="text-xl font-semibold">{quiz.questions[card].prompt}</h4><Button variant="outline" aria-expanded={revealed} onClick={() => setRevealed(v => !v)}>{revealed ? 'Hide answer' : 'Reveal answer'}</Button>{revealed && <div className="space-y-3"><p className="whitespace-pre-wrap">{quiz.questions[card].answer}</p><p className="text-sm text-muted-foreground">{quiz.questions[card].explanation}</p><Evidence source={quiz.questions[card].source} /><div className="flex gap-2"><Button disabled={busy} onClick={() => markCard(true)}>I know this</Button><Button variant="outline" disabled={busy} onClick={() => markCard(false)}>Practise again</Button></div></div>}</article>
      <div className="flex justify-between"><Button variant="outline" disabled={card === 0} onClick={() => { setCard(v => v - 1); setRevealed(false); }}>Previous card</Button><Button variant="outline" disabled={card === quiz.questionCount - 1} onClick={() => { setCard(v => v + 1); setRevealed(false); }}>Next card</Button></div>{quiz.mastered.length === quiz.questionCount && <p role="status" className="rounded border p-4 font-semibold">All cards mastered. You can revisit them anytime.</p>}
    </> : quiz.status === 'ready' ? <div className="space-y-4 rounded-xl border p-6"><h4 className="text-lg font-semibold">Your quiz is ready</h4><p>{quiz.questionCount} questions · {quiz.durationMinutes} minutes · 1 point per question</p><p className="text-sm text-muted-foreground">Answers save as you work. The timer continues if you leave or refresh. When time ends, the saved answers are submitted automatically.</p><Button disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start quiz'}</Button></div> : quiz.status === 'completed' ? <>
      <div className="rounded-xl border bg-primary/5 p-6"><p className="text-sm">Quiz completed · {when(quiz.completedAt)}</p><p className="mt-2 text-3xl font-bold">{quiz.score} / {quiz.questionCount} <span className="text-lg font-medium">({quiz.percentage}%)</span></p><p className="mt-2 text-sm text-muted-foreground">Review the explanations and source passages below.{quiz.kind === 'written' && ' Short-answer scores are AI assessments for practice.'}</p></div>
      {quiz.questions.map((q: any, i: number) => <article key={i} className="space-y-3 rounded-xl border p-5"><div className="flex justify-between gap-3"><h4 className="font-semibold">{i + 1}. {q.prompt}</h4><span className="whitespace-nowrap rounded bg-muted px-2 py-1 text-sm">{quiz.results[i].points} / 1</span></div><p className="text-sm"><strong>Your answer: </strong>{quiz.answers[i] === '' ? 'Unanswered' : quiz.kind === 'mcq' ? q.options[Number(quiz.answers[i])] : quiz.answers[i]}</p><p className="text-sm"><strong>Expected answer: </strong>{q.answer}</p><p className="text-sm text-muted-foreground">{quiz.results[i].feedback}</p><Evidence source={q.source} /></article>)}
    </> : quiz.status === 'grading' || expired ? <div role="status" className="space-y-3 rounded-xl border p-6"><h4 className="text-lg font-semibold">{expired ? 'Time is up' : 'Quiz submitted'}</h4><p>Your saved answers are being graded. Your result will appear here automatically.</p>{quiz.gradeError && <p className="text-sm">{quiz.gradeError}</p>}<Button variant="outline" onClick={check}>Check result</Button></div> : <form onSubmit={submit} className="space-y-5">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 shadow-sm"><div><p className="text-xl font-bold" role="timer" aria-label="Time remaining">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p><p className="text-xs text-muted-foreground">{answers.filter(a => a.trim()).length} / {quiz.questionCount} answered</p></div><div className="text-right"><p role="status" className="text-xs">{saved}</p>{saved.startsWith('Answers could') && <Button type="button" variant="ghost" onClick={() => save()}>Retry save</Button>}</div></div>
      <fieldset disabled={busy || expired} className="space-y-4">{quiz.questions.map((q: any, i: number) => <fieldset key={i} className="space-y-3 rounded-xl border p-5"><legend className="px-1 text-sm font-semibold">Question {i + 1}</legend><p className="font-medium">{q.prompt}</p>{quiz.kind === 'mcq' ? q.options.map((o: string, j: number) => <label key={j} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${answers[i] === String(j) ? 'border-primary bg-primary/5' : ''}`}><input type="radio" name={`practice-${i}`} checked={answers[i] === String(j)} onChange={() => answer(i, String(j))} /><span>{o}</span></label>) : <textarea className={`${field} min-h-28`} aria-label={`Answer question ${i + 1}`} maxLength={2000} value={answers[i] ?? ''} onChange={e => answer(i, e.target.value)} onBlur={() => save()} placeholder="Write your answer in your own words…" />}</fieldset>)}</fieldset><Button disabled={busy || expired}>{busy ? 'Submitting and grading…' : 'Submit quiz & see result'}</Button><p className="text-xs text-muted-foreground">Unanswered questions receive zero points. Submitted answers cannot be changed.</p>
    </form>}
  </section>;
}
