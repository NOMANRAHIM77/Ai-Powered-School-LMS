"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, BookOpenCheck, CalendarCheck2, ClipboardCheck, GraduationCap, LayoutDashboard, LoaderCircle, LogOut, Menu, Settings2, TableProperties, WalletCards } from "lucide-react";
import { useTheme } from "next-themes";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudentVoucherRecord } from "@/components/student-voucher-record";
import { AnnouncementBell, StudentAnnouncements } from "@/components/announcements";
import { AcademicYearBadge } from "@/components/academic-year";
import { Complaints } from "@/components/complaints";
import { StudentAssignments } from "@/components/course-learning";
import { CourseWorkspace } from "@/components/course-workspace";
import { StudentProfileMenu } from "@/components/student-profile-menu";
import { StudentAvatar, StudentPhotoInput } from "@/components/student-photo";
import { cn } from "@/lib/utils";

type Section = "courses" | "assignments" | "complaints" | "home" | "attendance" | "results" | "fees" | "timetable" | "notices" | "announcements" | "profile";
const labels: Record<"en" | "ur", Record<Section | "logout" | "loading" | "empty" | "retry" | "save" | "more", string>> = {
  en: { courses: "My courses", assignments: "Assignments", complaints: "Complaints", home: "Home", attendance: "Attendance", results: "Results", fees: "Fees", timetable: "Timetable", notices: "Notices", announcements: "Announcements", profile: "Profile & settings", logout: "Log out", loading: "Loading your workspace…", empty: "No records are available yet.", retry: "Try again", save: "Save changes", more: "More" },
  ur: { courses: "میرے کورسز", assignments: "اسائنمنٹس", complaints: "شکایات", home: "ہوم", attendance: "حاضری", results: "نتائج", fees: "فیس", timetable: "ٹائم ٹیبل", notices: "اطلاعات", announcements: "اعلانات", profile: "پروفائل اور ترتیبات", logout: "لاگ آؤٹ", loading: "آپ کا پورٹل لوڈ ہو رہا ہے…", empty: "ابھی کوئی ریکارڈ دستیاب نہیں ہے۔", retry: "دوبارہ کوشش کریں", save: "تبدیلیاں محفوظ کریں", more: "مزید" },
};
const navigation: { id: Section; icon: typeof LayoutDashboard }[] = [
  { id: "home", icon: LayoutDashboard }, { id: "courses", icon: BookOpenCheck }, { id: "assignments", icon: ClipboardCheck }, { id: "attendance", icon: CalendarCheck2 }, { id: "results", icon: ClipboardCheck }, { id: "fees", icon: WalletCards }, { id: "timetable", icon: TableProperties }, { id: "announcements", icon: Bell }, { id: "complaints", icon: Bell }, { id: "profile", icon: Settings2 },
];
type Profile = { student: { userId: { name: string; email: string }; admissionNo: string; photo?: string; dob?: string; gender?: string; admissionDate?: string; status?: string; rollNo?: string; phone?: string; address?: string }; enrollment: any; preferences: any };

export default function StudentPortal() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [section, setSection] = useState<Section>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const [prefs, setPrefs] = useState({ theme: "system", emailNotifications: true, inAppNotifications: true, reducedMotion: false });
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const t = labels[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);
    return () => { document.documentElement.lang = "en"; document.documentElement.dir = "ltr"; document.documentElement.classList.remove("reduce-motion"); };
  }, [language, prefs.reducedMotion]);

  useEffect(() => {
    if (!localStorage.getItem("educore-access-token")) { router.replace("/login/student"); return; }
    api.get("/student/profile").then(({ data: response }) => {
      const next: Profile = response.data;
      setProfile(next); setProfileName(next.student.userId.name); setPhone(next.student?.phone ?? ""); setAddress(next.student?.address ?? "");
      if (next.preferences) { setLanguage(next.preferences.language); setPrefs({ theme: next.preferences.theme, emailNotifications: next.preferences.emailNotifications, inAppNotifications: next.preferences.inAppNotifications, reducedMotion: next.preferences.reducedMotion }); setTheme(next.preferences.theme); }
    }).catch((err) => {
      if (err.response?.status === 401) router.replace("/login/student");
      else { setError(err.response?.data?.message ?? "Unable to load your profile. Please try again."); setLoading(false); }
    });
  }, [router, setTheme]);

  useEffect(() => {
    if (!profile) return;
    if (section === "courses" || section === "assignments" || section === "complaints" || section === "profile" || section === "announcements" || section === "attendance") { setLoading(false); setError(""); return; }
    let active = true;
    setLoading(true); setError(""); setData(null);
    const path: Record<Exclude<Section, "courses" | "assignments" | "profile" | "announcements" | "complaints">, string> = { home: "/dashboard/student", attendance: "/student/attendance", results: "/student/results", fees: "/student/vouchers", timetable: "/student/timetable", notices: "/student/notices" };
    api.get(path[section], { params: section === "home" || section === "timetable" ? undefined : { page, limit: 20 } }).then(({ data: response }) => { if (active) setData(response.data); }).catch((err) => { if (active) setError(err.response?.data?.message ?? "Unable to load this page. Please try again."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, profile, page]);

  useEffect(() => {
    const refreshPhoto = () => {
      if (document.visibilityState !== 'visible' || !localStorage.getItem('educore-access-token')) return;
      api.get('/student/profile').then(({ data }) => setProfile(current => current ? { ...current, student: { ...current.student, photo: data.data.student.photo } } : current)).catch(() => {});
    };
    window.addEventListener('focus', refreshPhoto); document.addEventListener('visibilitychange', refreshPhoto);
    return () => { window.removeEventListener('focus', refreshPhoto); document.removeEventListener('visibilitychange', refreshPhoto); };
  }, []);

  async function uploadProfilePhoto(file: File | null) {
    setProfilePhoto(file); if (!file) return;
    setSavingProfile(true); setError(''); setMessage('');
    try {
      const form = new FormData(); form.append('photo', file);
      const { data } = await api.patch('/student/profile', form);
      setProfile(current => current ? { ...current, student: { ...current.student, photo: data.data.photo } } : current);
      setProfilePhoto(null); setMessage('Profile photo saved. Your navbar picture is updated.');
    } catch (error: any) { setError(error.response?.data?.message ?? 'Photo could not be saved. Please retry.'); }
    finally { setSavingProfile(false); }
  }

  async function logout() {
    try { await api.post("/auth/logout", {}, { timeout: 5000 }); } catch { /* Clear the local session even if offline. */ }
    localStorage.removeItem("educore-access-token"); localStorage.removeItem("educore-role"); router.replace("/");
  }
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if (savingProfile) return; setSavingProfile(true); setError(""); setMessage("");
    try { const form = new FormData(); form.append("name", profileName); form.append("phone", phone); form.append("address", address); if (profilePhoto) form.append("photo", profilePhoto); const updated = await api.patch("/student/profile", form); setProfile(current => current ? { ...current, student: { ...current.student, ...updated.data.data, userId: { ...current.student.userId, name: profileName.trim() } } } : current); setProfilePhoto(null); await api.put("/student/preferences", { ...prefs, language }); setTheme(prefs.theme); setMessage(language === "ur" ? "تبدیلیاں محفوظ ہو گئیں۔" : "Changes saved."); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to save your changes."); } finally { setSavingProfile(false); }
  }
  const choose = (next: Section) => { setPage(1); setSection(next); setMore(false); setMessage(""); };
  const side = <><div className="flex items-center gap-3 border-b p-5"><span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpenCheck className="size-5" /></span><div><p className="font-display font-bold">EduCore</p><p className="text-xs text-muted-foreground">Student portal</p></div></div><nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Student navigation">{navigation.map(({ id, icon: Icon }) => <button key={id} onClick={() => choose(id)} className={cn("flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-start text-sm font-medium", section === id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted")}><Icon className="size-5" />{t[id]}</button>)}</nav><div className="border-t p-3"><button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-destructive hover:bg-danger-soft"><LogOut className="size-5" />{t.logout}</button></div></>;

  return <div dir={language === "ur" ? "rtl" : "ltr"} className="min-h-screen bg-background">
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e bg-sidebar lg:flex">{side}</aside>
    {more && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMore(false)}><aside className="flex h-full w-64 flex-col bg-sidebar" onClick={(event) => event.stopPropagation()}>{side}</aside></div>}
    <div className="lg:ps-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button onClick={() => setMore(true)} className="grid size-11 place-items-center rounded-md hover:bg-muted lg:hidden" aria-label={t.more}><Menu /></button><span className="hidden font-display font-semibold md:inline">{t[section]}</span></div><div className="flex items-center gap-1 sm:gap-3"><span className="hidden sm:inline"><AcademicYearBadge /></span><AnnouncementBell /><ThemeToggle /><StudentProfileMenu name={profile?.student?.userId?.name ?? "Student"} photo={profile?.student?.photo} onProfile={() => choose("profile")} /></div></header>
      <main className="mx-auto max-w-6xl px-4 py-7 pb-24 sm:px-8 lg:pb-8"><h1 className="font-display text-3xl font-bold">{section === "home" && profile ? `${language === "ur" ? "خوش آمدید" : "Welcome back"}, ${profile.student.userId.name.split(" ")[0]}` : t[section]}</h1><p className="mt-2 text-sm text-muted-foreground">{section === "home" ? (language === "ur" ? "آپ کی تعلیمی سرگرمیوں کا جائزہ" : "Your school day, all in one place.") : t[section]}</p>
        {profile && section === "courses" && <CourseWorkspace role="student" />}
        {profile && section === "assignments" && <StudentAssignments />}
        {profile && section === "complaints" && <Complaints />}
        {profile && (section === "home" || section === "attendance") && <CourseWorkspace role="student" />}
        {loading && <div className="mt-8 flex items-center gap-3 rounded-xl border bg-card p-8 text-muted-foreground" role="status"><LoaderCircle className="size-5 animate-spin" />{t.loading}</div>}
        {!loading && error && <Card className="mt-8 p-6" role="alert"><p className="text-destructive">{error}</p><Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>{t.retry}</Button></Card>}
        {!loading && !error && section === "home" && data && <div className="mt-8 grid gap-4 md:grid-cols-3"><Metric title={t.results} value={data.latestResults?.[0] ? `${data.latestResults[0].percentage}%` : "—"} detail={data.latestResults?.[0]?.examId?.name ?? t.empty} onClick={() => choose("results")} /><Metric title={t.fees} value={data.feeVoucher?.status ?? "—"} detail={data.feeVoucher ? `PKR ${data.feeVoucher.total - data.feeVoucher.paid}` : t.empty} onClick={() => choose("fees")} /><Card className="p-6 md:col-span-2"><h2 className="font-display text-lg font-bold">{t.timetable}</h2><div className="mt-4 space-y-3">{data.timetable?.flatMap((entry: any) => entry.periods ?? []).length ? data.timetable.flatMap((entry: any) => entry.periods ?? []).map((period: any) => <p key={period._id} className="rounded-lg bg-muted p-3 text-sm"><strong>{period.subjectId?.name}</strong> · {period.start}–{period.end}</p>) : <p className="text-sm text-muted-foreground">{t.empty}</p>}</div></Card><Card className="p-6"><h2 className="font-display text-lg font-bold">{t.announcements}</h2><p className="mt-3 text-sm text-muted-foreground">School updates and attachments</p><Button className="mt-4" variant="outline" onClick={() => choose("announcements")}>View announcements</Button></Card></div>}
        {!loading && !error && section !== "home" && section !== "profile" && section !== "announcements" && section !== "attendance" && section !== "complaints" && section !== "courses" && section !== "assignments" && <div className="mt-8 space-y-3">{data?.items?.length ? data.items.map((item: any, index: number) => <Card key={item._id ?? `${item.date}-${index}`} className="p-5">{section === "fees" ? <StudentVoucherRecord voucher={item} /> : <Record section={section} item={item} />}</Card>) : <Card className="p-8 text-sm text-muted-foreground">{t.empty}</Card>}</div>}
        {!loading && !error && section === "announcements" && <StudentAnnouncements language={language} />}
        {!loading && section === "profile" && profile && <form onSubmit={saveProfile} className="mt-8 grid gap-5 lg:grid-cols-2"><Card className="space-y-4 p-6"><h2 className="font-display text-lg font-bold">{language === "ur" ? "پروفائل" : "Your profile"}</h2><StudentPhotoInput label="Profile photo" file={profilePhoto} onChange={file => void uploadProfilePhoto(file)} currentPhoto={profile.student.photo} name={profileName} disabled={savingProfile} /><label className="grid gap-2 text-sm font-semibold">Name<Input required minLength={2} maxLength={120} value={profileName} disabled={savingProfile} onChange={e => setProfileName(e.target.value)} /></label><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Date of birth</dt><dd>{profile.student.dob?.slice(0, 10) ?? "Not recorded"}</dd></div><div><dt className="text-muted-foreground">Gender</dt><dd className="capitalize">{profile.student.gender ?? "Not recorded"}</dd></div><div><dt className="text-muted-foreground">Admission date</dt><dd>{profile.student.admissionDate?.slice(0, 10) ?? "Not recorded"}</dd></div><div><dt className="text-muted-foreground">Academic year</dt><dd>{profile.enrollment?.academicYearId?.name ?? "Not assigned"}</dd></div></dl><p className="text-sm text-muted-foreground">{profile.student.userId.name} · {profile.student.userId.email}</p><p className="text-sm text-muted-foreground">{profile.student.admissionNo} · {profile.enrollment?.sectionId?.classId?.name ?? "—"} {profile.enrollment?.sectionId?.name ?? ""}</p><label className="grid gap-2 text-sm font-semibold">{language === "ur" ? "فون" : "Phone"}<Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></label><label className="grid gap-2 text-sm font-semibold">{language === "ur" ? "پتہ" : "Address"}<Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} /></label></Card><Card className="space-y-4 p-6"><h2 className="font-display text-lg font-bold">{language === "ur" ? "ترتیبات" : "Preferences"}</h2><label className="grid gap-2 text-sm font-semibold">{language === "ur" ? "زبان" : "Language"}<select className="h-11 rounded-md border bg-background px-3" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ur")}><option value="en">English</option><option value="ur">اردو</option></select></label><label className="grid gap-2 text-sm font-semibold">{language === "ur" ? "تھیم" : "Theme"}<select className="h-11 rounded-md border bg-background px-3" value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>{(["emailNotifications", "inAppNotifications", "reducedMotion"] as const).map((key) => <label className="flex min-h-11 items-center justify-between gap-3 text-sm" key={key}><span>{key === "emailNotifications" ? "Email notifications" : key === "inAppNotifications" ? "In-app notifications" : "Reduce motion"}</span><input type="checkbox" className="size-5 accent-primary" checked={prefs[key]} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })} /></label>)}<Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : t.save}</Button>{message && <p role="status" className="text-sm text-success">{message}</p>}</Card></form>}
        {!loading && !error && data?.total > data?.limit && section !== "home" && section !== "profile" && section !== "announcements" && section !== "attendance" && section !== "complaints" && section !== "courses" && section !== "assignments" && <div className="mt-5 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{language === "ur" ? "پچھلا" : "Previous"}</Button><span className="text-sm text-muted-foreground">{page} / {Math.ceil(data.total / data.limit)}</span><Button variant="outline" disabled={page * data.limit >= data.total} onClick={() => setPage(value => value + 1)}>{language === "ur" ? "اگلا" : "Next"}</Button></div>}
      </main></div>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 justify-around border-t bg-card lg:hidden" aria-label="Mobile navigation">{navigation.slice(0, 4).map(({ id, icon: Icon }) => <button key={id} onClick={() => choose(id)} className={cn("flex min-w-14 flex-col items-center justify-center gap-1 text-xs", section === id ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" />{t[id]}</button>)}<button onClick={() => setMore(true)} className="flex min-w-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"><Menu className="size-5" />{t.more}</button></nav>
  </div>;
}

function Metric({ title, value, detail, onClick }: { title: string; value: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-xl border bg-card p-6 text-start shadow-sm transition hover:border-primary"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 font-display text-3xl font-bold capitalize">{value}</p><p className="mt-3 text-xs text-muted-foreground">{detail}</p></button>;
}

function Record({ section, item }: { section: Section; item: any }) {
  if (section === "attendance") return <div className="flex justify-between gap-4"><span>{new Date(item.date).toLocaleDateString()}</span><strong className="capitalize">{item.status}</strong></div>;
  if (section === "results") return <div><div className="flex justify-between gap-4"><strong>{item.examId?.name}</strong><span>{item.percentage}% · {item.grade}</span></div><div className="mt-3 space-y-1 text-sm text-muted-foreground">{item.marks?.map((mark: any) => <p key={mark._id}>{mark.subjectId?.name}: {mark.obtained} · {mark.grade}</p>)}</div></div>;
  if (section === "fees") return <div className="flex flex-wrap justify-between gap-3"><div><strong>{item.month}/{item.year}</strong><p className="mt-1 text-sm text-muted-foreground">Due {new Date(item.dueDate).toLocaleDateString()}</p></div><div className="text-end"><strong>PKR {item.total - item.paid}</strong><p className="mt-1 text-sm capitalize text-muted-foreground">{item.status}</p></div></div>;
  if (section === "notices") return <div><strong>{item.isPinned ? "📌 " : ""}{item.title}</strong><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p></div>;
  return <div><strong className="capitalize">{item.day}</strong><div className="mt-3 space-y-2 text-sm text-muted-foreground">{item.periods?.map((period: any) => <p key={period._id}>{period.start}–{period.end} · {period.subjectId?.name} {period.room ? `· ${period.room}` : ""}</p>)}</div></div>;
}


