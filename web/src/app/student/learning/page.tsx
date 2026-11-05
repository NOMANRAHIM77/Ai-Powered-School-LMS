"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenCheck, CalendarClock, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Tab = "courses" | "assignments" | "leave";
export default function LearningPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("courses");
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [completed, setCompleted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("educore-access-token")) { router.replace("/login/student"); return; }
    let active = true;
    setLoading(true); setError("");
    api.get(`/student/${tab}`, { params: { page, limit: 12 } }).then(({ data: response }) => { if (active) setData(response.data); }).catch((err) => { if (!active) return; if (err.response?.status === 401) router.replace("/login/student"); else setError(err.response?.data?.message ?? "Unable to load this page."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, page, version, router]);

  async function openCourse(id: string) { setError(""); try { const response = await api.get(`/student/courses/${id}`); setDetail(response.data.data); setLesson(null); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to load course."); } }
  async function openLesson(id: string) { setError(""); try { const response = await api.get(`/student/lessons/${id}`); const value = response.data.data; setLesson(value.lesson); setNote(value.progress?.note ?? ""); setCompleted(value.progress?.completed ?? false); setBookmarked(value.progress?.bookmarked ?? false); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to load lesson."); } }
  async function saveLesson() { setError(""); try { await api.put(`/student/lessons/${lesson._id}/progress`, { note, completed, bookmarked }); setMessage("Lesson progress saved."); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to save progress."); } }
  async function openAssignment(id: string) { setError(""); try { const response = await api.get(`/student/assignments/${id}`); setDetail(response.data.data); setText(response.data.data.submission?.text ?? ""); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to load assignment."); } }
  async function saveAssignment(submit: boolean) { setError(""); try { const response = await api.put(`/student/assignments/${detail.assignment._id}/submission`, { text, submit }); setDetail({ ...detail, submission: response.data.data }); setMessage(submit ? "Assignment submitted." : "Draft saved."); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to save assignment."); } }
  async function submitLeave(event: React.FormEvent) { event.preventDefault(); setError(""); try { await api.post("/student/leave", { startDate, endDate, reason }); setMessage("Leave request submitted."); setReason(""); setStartDate(""); setEndDate(""); setPage(1); setVersion(value => value + 1); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to submit leave request."); } }
  function switchTab(next: Tab) { setTab(next); setPage(1); setDetail(null); setLesson(null); setMessage(""); }

  return <main className="min-h-screen bg-background px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><Button asChild variant="ghost"><Link href="/student"><ArrowLeft />Back to student portal</Link></Button><div className="mt-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Student workspace</p><h1 className="mt-2 font-display text-3xl font-bold">Learning & requests</h1><p className="mt-2 text-sm text-muted-foreground">Explore your enrolled courses and manage your work.</p></div><div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Learning sections"><Button variant={tab === "courses" ? "default" : "outline"} onClick={() => switchTab("courses")}><BookOpenCheck />Courses</Button><Button variant={tab === "assignments" ? "default" : "outline"} onClick={() => switchTab("assignments")}><ClipboardList />Assignments</Button><Button variant={tab === "leave" ? "default" : "outline"} onClick={() => switchTab("leave")}><CalendarClock />Leave requests</Button></div>
    {error && <p className="mt-5 rounded-lg bg-danger-soft p-4 text-sm text-destructive" role="alert">{error}</p>}{message && <p className="mt-5 rounded-lg bg-success-soft p-4 text-sm text-success" role="status">{message}</p>}
    {tab === "leave" && <Card className="mt-6 p-6"><h2 className="font-display text-xl font-bold">Request leave</h2><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submitLeave}><label className="grid gap-2 text-sm font-medium">From<Input type="date" required value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">To<Input type="date" min={startDate} required value={endDate} onChange={event => setEndDate(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Reason<textarea className="min-h-24 rounded-md border bg-background p-3" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><div><Button type="submit">Submit request</Button></div></form></Card>}
    {detail && <Card className="mt-6 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{detail.course?.title ?? detail.assignment?.title}</h2><Button variant="outline" onClick={() => { setDetail(null); setLesson(null); setMessage(""); }}>Close</Button></div>{tab === "courses" && <><p className="mt-2 text-sm text-muted-foreground">{detail.course.description}</p><div className="mt-4 flex flex-wrap gap-2">{detail.lessons.map((item: any) => <Button key={item._id} variant="outline" onClick={() => openLesson(item._id)}>{item.title}</Button>)}</div>{!detail.lessons.length && <p className="mt-4 text-sm text-muted-foreground">No lessons published yet.</p>}{lesson && <div className="mt-6 border-t pt-5"><h3 className="font-display text-lg font-bold">{lesson.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{lesson.body}</p><label className="mt-5 grid gap-2 text-sm font-medium">Your private notes<textarea className="min-h-28 rounded-md border bg-background p-3" maxLength={10000} value={note} onChange={event => setNote(event.target.value)} /></label><div className="mt-4 flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} /> Mark complete</label><label className="flex items-center gap-2"><input type="checkbox" checked={bookmarked} onChange={event => setBookmarked(event.target.checked)} /> Bookmark</label></div><Button className="mt-4" onClick={saveLesson}>Save progress</Button></div>}</>}{tab === "assignments" && <><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{detail.assignment.instructions}</p><p className="mt-3 text-sm text-muted-foreground">Due {new Date(detail.assignment.dueAt).toLocaleString()} · {detail.assignment.allowLate ? "Late submissions allowed" : "Late submissions closed"}</p>{detail.submission?.status === "graded" && <p className="mt-3 text-sm">Grade: {detail.submission.grade} · {detail.submission.feedback}</p>}<label className="mt-5 grid gap-2 text-sm font-medium">Your response<textarea className="min-h-36 rounded-md border bg-background p-3" maxLength={30000} value={text} onChange={event => setText(event.target.value)} /></label><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => saveAssignment(false)}>Save draft</Button><Button onClick={() => saveAssignment(true)}>Submit work</Button></div></>}</Card>}
    <div className="mt-6 space-y-3">{loading ? <p role="status" className="rounded-lg border p-6 text-sm text-muted-foreground">Loading…</p> : data?.items?.length ? data.items.map((item: any) => <Card key={item._id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold">{tab === "leave" ? `${new Date(item.startDate).toLocaleDateString()} – ${new Date(item.endDate).toLocaleDateString()}` : item.title}</p><p className="mt-1 text-sm text-muted-foreground">{tab === "courses" ? item.subjectId?.name : tab === "assignments" ? `Due ${new Date(item.dueAt).toLocaleDateString()} · ${data.submissions?.find((s: any) => s.assignmentId === item._id)?.status ?? "pending"}` : `${item.status} · ${item.reason}`}</p></div>{tab !== "leave" && <Button variant="outline" onClick={() => tab === "courses" ? openCourse(item._id) : openAssignment(item._id)}>Open</Button>}</Card>) : <Card className="p-6 text-sm text-muted-foreground">No records are available yet.</Card>}</div>
    {!loading && data?.total > data?.limit && <div className="mt-5 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / data.limit)}</span><Button variant="outline" disabled={page * data.limit >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
  </div></main>;
}
