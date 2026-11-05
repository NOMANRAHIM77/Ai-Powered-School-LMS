"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpenCheck, ChevronDown, GraduationCap, LayoutDashboard, LoaderCircle, LogOut, Menu, ShieldCheck, UserCog, UserPlus, Users, X } from "lucide-react";
import { AnnouncementManager } from "@/components/announcements";
import { AcademicYearBadge, AcademicYearManager } from "@/components/academic-year";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { AdminDashboardSummary } from "@/components/admin-dashboard-summary";
import { Input } from "@/components/ui/input";
import { FormModal } from "@/components/form-modal";
import { ConfirmationModal } from "@/components/confirm-dialog";
import { StudentPhotoInput } from "@/components/student-photo";
import { Complaints } from "@/components/complaints";
import { CourseWorkspace } from "@/components/course-workspace";
import { TeacherSubjectPicker } from "@/components/teacher-subject-picker";
import { cn } from "@/lib/utils";

import { AccountDirectory } from "@/components/admin-account-directory";
import { emptyAccountFilters, schoolStreams, type AccountFilters, type Account, type Role, type Wing, type SchoolClass } from "@/components/admin-account-types";
const categories: { id: Role; label: string; icon: typeof Users }[] = [{ id: "student", label: "Student accounts", icon: GraduationCap }, { id: "teacher", label: "Teacher accounts", icon: UserCog }, { id: "parent", label: "Parent accounts", icon: Users }, { id: "admin", label: "Admin accounts", icon: ShieldCheck }];

export default function AdminUsersPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Role | null>(null);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [complaintsOpen, setComplaintsOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [items, setItems] = useState<Account[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AccountFilters>({ ...emptyAccountFilters });
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [resetting, setResetting] = useState<Account | null>(null);
  const [removing, setRemoving] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("female");
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [wing, setWing] = useState<Wing | "">("");
  const [teacherSections, setTeacherSections] = useState<string[]>([]);
  const [teacherClass, setTeacherClass] = useState("");
  const [teacherStream, setTeacherStream] = useState("");
  const [preparingSections, setPreparingSections] = useState(false);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentStream, setStudentStream] = useState("");
  const subjectOptions = Array.from(new Set(classes.flatMap(item => item.sections.filter(section => teacherSections.includes(section._id)).flatMap(section => section.subjectNames ?? []))));
  useEffect(() => { setTeacherSubjects(current => current.filter(name => subjectOptions.includes(name))); }, [teacherSections, classes]);

  useEffect(() => {
    if (!localStorage.getItem("educore-access-token")) { router.replace("/login/admin"); return; }
    let live = true;
    api.get("/admin/users/academic-options").then(({ data }) => { if (live) { setClasses(data.data.classes); setYear(data.data.year?.name ?? ""); } }).catch(err => { if (!live) return; if (err.response?.status === 401) router.replace("/login/admin"); else setError(err.response?.status === 403 ? "Administrator access is required." : "Could not load classes and sections."); });
    return () => { live = false; };
  }, [router]);


  useEffect(() => {
    if (!category || !localStorage.getItem("educore-access-token")) return;
    let live = true;
    setLoading(true); setError("");
    const timer = window.setTimeout(() => api.get(category === "student" ? "/admin/users/students" : "/admin/users", { params: { ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")), page, ...(category !== "student" ? { role: category } : {}) } }).then(({ data }) => {
      if (!live) return;
      if (page > 1 && !data.data.items.length) { setPage(Math.max(1, Math.ceil(data.data.total / Number(filters.limit)))); return; }
      setItems(data.data.items); setTotal(data.data.total); setCurrentUserId(data.data.currentUserId ?? "");
    }).catch(err => { if (!live) return; setItems([]); setTotal(0); if (err.response?.status === 401) router.replace("/login/admin"); else setError(err.response?.status === 403 ? "Administrator access is required." : err.response?.data?.message ?? "Unable to load accounts."); }).finally(() => { if (live) setLoading(false); }), 250);
    return () => { live = false; window.clearTimeout(timer); };
  }, [category, page, version, router, filters]);

  const selectCategory = (next: Role | null) => { setComplaintsOpen(false); setCoursesOpen(false); setYearOpen(false); setAnnouncementsOpen(false); setCategory(next); setFilters({ ...emptyAccountFilters }); setPage(1); setItems([]); setMobileOpen(false); setFormOpen(false); setEditing(null); setResetting(null); setError(""); setMessage(""); };
  const clearForm = () => { setParentName(""); setParentPhone(""); setStudentCode(""); setTeacherSubjects([]); setPhoto(null); setName(""); setEmail(""); setPassword(""); setAdmissionNo(""); setAdmissionDate(""); setDob(""); setGender("female"); setEmployeeId(""); setWing(""); setTeacherSections([]); setTeacherClass(""); setTeacherStream(""); setClassId(""); setSectionId(""); setStudentStream(""); };
  const reloadAcademicOptions = async () => { const { data } = await api.get("/admin/users/academic-options"); setClasses(data.data.classes); setYear(data.data.year?.name ?? ""); };
  const startCreate = async () => { clearForm(); setFormError(""); setEditing(null); setFormOpen(true); setMessage(""); setError(""); if ((category === "teacher" || category === "student") && year) { setPreparingSections(true); try { await api.post("/admin/users/academic-options/prepare"); await reloadAcademicOptions(); } catch (err: any) { setFormError(err.response?.data?.message ?? "Unable to prepare class sections."); } finally { setPreparingSections(false); } } };
  const startEdit = (account: Account) => { clearForm(); setFormError(""); setEditing(account); setName(account.name); setEmail(account.email); setAdmissionNo(account.student?.admissionNo ?? ""); setAdmissionDate(account.student?.admissionDate?.slice(0, 10) ?? ""); setDob(account.student?.dob ? account.student.dob.slice(0, 10) : ""); setGender(account.student?.gender ?? "female"); setClassId(account.enrollment?.classId ?? ""); setWing(classes.find(item => item._id === account.enrollment?.classId)?.wing ?? ""); setStudentStream(schoolStreams.find(stream => account.enrollment?.sectionName?.startsWith(`${stream} - `)) ?? ""); setSectionId(account.enrollment?.sectionId ?? ""); setFormOpen(true); setError(""); setMessage(""); };

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault(); if (!category || saving || preparingSections) return; setFormError(""); setMessage(""); setSaving(true);
    if (category === "teacher" && (!wing || !teacherSections.length || !teacherSubjects.length)) { setFormError("Choose a wing, sections, and teaching subjects."); setSaving(false); return; }
    if (category === "student" && (!wing || !classId || !sectionId || (wing !== "primary" && !studentStream))) { setFormError("Choose the student's wing, class, stream (if applicable), and section."); setSaving(false); return; }
    try {
      const payload = (data: Record<string, unknown>): { data: Record<string, unknown> | FormData; headers?: { 'Content-Type': string } } => {
        if (!photo || !['student', 'teacher'].includes(category!)) return { data };
        const form = new FormData();
        for (const [key, value] of Object.entries(data)) if (Array.isArray(value)) value.forEach(item => form.append(key + '[]', String(item))); else if (value !== undefined) form.append(key, String(value));
        form.append('photo', photo);
        return { data: form, headers: { 'Content-Type': 'multipart/form-data' } };
      };
      let restored = false;
      let registeredCode = '';
      if (editing) await api.request({ method: 'patch', url: `/admin/users/students/${editing._id}`, ...payload({ name, email, admissionNo, dob, gender, ...(admissionDate ? { admissionDate } : {}), ...(sectionId ? { sectionId } : {}) }) });
      else { const response = await api.request({ method: 'post', url: '/admin/users', ...payload({ name, email, password, role: category, ...(category === "parent" ? { studentCode } : {}), ...(category === "student" ? { admissionNo, dob, gender, wing, parentName, parentPhone, ...(admissionDate ? { admissionDate } : {}), ...(sectionId ? { sectionId } : {}) } : {}), ...(category === "teacher" ? { employeeId, wing, sectionIds: teacherSections, subjectNames: teacherSubjects } : {}) }) }); restored = response.data.data.restored === true; registeredCode = response.data.data.studentCode ?? ""; }
      setMessage(editing ? "Student details updated." : restored ? "Student account restored with the entered password and class details. Previous school records were preserved." : `Account created. ${registeredCode ? `Student ID: ${registeredCode}. ` : ""}Share the login details securely.`); setFormOpen(false); setEditing(null); clearForm(); setPage(1); setVersion(value => value + 1);
    } catch (err: any) { setFormError(err.response?.data?.message ?? "Unable to save the account."); }
    finally { setSaving(false); }
  }

  async function changeStatus(account: Account) {
    if (!window.confirm(`${account.isActive ? "Disable" : "Enable"} ${account.name}'s account?`)) return;
    setError(""); setMessage("");
    try { await api.patch(`/admin/users/${account._id}/status`, { isActive: !account.isActive }); setMessage(account.isActive ? "Account disabled." : "Account enabled."); setVersion(value => value + 1); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to update account status."); }
  }
  async function removeStudent(account: Account) {
    setError(""); setMessage("");
    try { await api.delete(`/admin/users/students/${account._id}`); setMessage("Student account removed. School records were preserved."); if (items.length === 1 && page > 1) setPage(page - 1); else setVersion(value => value + 1); }
    catch (err: any) { throw new Error(err.response?.data?.message ?? "Unable to remove student. Please try again."); }
  }
  async function resetPassword(event: React.FormEvent) {
    event.preventDefault(); if (!resetting || saving) return; setSaving(true); setFormError("");
    try { await api.patch(`/admin/users/students/${resetting._id}/password`, { password }); setMessage("Password reset. Existing sessions have been signed out."); setPassword(""); setResetting(null); }
    catch (err: any) { setFormError(err.response?.data?.message ?? "Unable to reset password."); }
    finally { setSaving(false); }
  }
  async function logout() { try { await api.post("/auth/logout", {}, { timeout: 5000 }); } catch { /* Clear local session if offline. */ } localStorage.removeItem("educore-access-token"); localStorage.removeItem("educore-role"); router.replace("/"); }
  const sidebar = <><div className="flex h-16 items-center justify-between border-b px-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpenCheck className="size-5" /></span><div><p className="font-display font-bold">EduCore</p><p className="text-xs text-muted-foreground">Administrator</p></div></div><button className="grid size-10 place-items-center lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button></div><nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Admin navigation"><button className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm font-semibold", !category && !announcementsOpen && !yearOpen && !coursesOpen && !complaintsOpen ? "bg-accent text-accent-foreground" : "hover:bg-muted")} onClick={() => selectCategory(null)}><LayoutDashboard className="size-5" />Dashboard</button><button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm font-semibold hover:bg-muted" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><Users className="size-5" />Manage accounts<ChevronDown className={cn("ms-auto size-4 transition-transform", !expanded && "-rotate-90")} /></button>{expanded && <div className="space-y-1 ps-4">{categories.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => selectCategory(id)} className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm", category === id ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted")}><Icon className="size-4" />{label}</button>)}</div>}<button className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm font-semibold", announcementsOpen ? "bg-accent text-accent-foreground" : "hover:bg-muted")} onClick={() => { selectCategory(null); setAnnouncementsOpen(true); }}><Bell className="size-5" />Announcements</button><button className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm font-semibold", yearOpen ? "bg-accent text-accent-foreground" : "hover:bg-muted")} onClick={() => { selectCategory(null); setYearOpen(true); }}><BookOpenCheck className="size-5" />Academic year</button><button className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm font-semibold", coursesOpen ? "bg-accent text-accent-foreground" : "hover:bg-muted")} onClick={() => { selectCategory(null); setCoursesOpen(true); }}><BookOpenCheck className="size-5" />Courses</button><button className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm font-semibold", complaintsOpen ? "bg-accent text-accent-foreground" : "hover:bg-muted")} onClick={() => { selectCategory(null); setComplaintsOpen(true); }}><Bell className="size-5" />Complaints</button></nav><div className="border-t p-3"><Button className="w-full justify-start" variant="ghost" onClick={logout}><LogOut />Log out</Button></div></>;
  const categoryTitle = categories.find(item => item.id === category)?.label;
  const availableSections = (classes.find(item => item._id === classId)?.sections ?? []).filter(section => wing === "primary" ? ["A", "B", "C", "D"].includes(section.name) : Boolean(studentStream) && section.name.startsWith(`${studentStream} - `));
  const wingClasses = classes.filter(item => item.wing === wing);
  const selectedClass = classes.find(item => item._id === teacherClass);
  const selectableSections = (selectedClass?.sections ?? []).filter(section => wing === "primary" ? ["A", "B", "C", "D"].includes(section.name) : teacherStream && ["A", "B", "C", "D"].some(letter => section.name === `${teacherStream} - ${letter}`));
  const selectedVisibleSections = selectableSections.filter(section => teacherSections.includes(section._id));
  const visibleSubjectOptions = Array.from(new Set(selectedVisibleSections.flatMap(section => section.subjectNames ?? [])));

  return <div className="min-h-screen bg-background"><aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e bg-sidebar lg:flex">{sidebar}</aside>{mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}><aside className="flex h-full w-64 flex-col bg-sidebar" onClick={event => event.stopPropagation()}>{sidebar}</aside></div>}<div className="lg:ps-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button className="grid size-11 place-items-center rounded-lg hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button><span className="text-sm font-semibold">{complaintsOpen ? "Complaints" : coursesOpen ? "Courses" : yearOpen ? "Academic year" : announcementsOpen ? "Announcements" : categoryTitle ?? "Dashboard"}</span></div><div className="flex items-center gap-2"><AcademicYearBadge /><ThemeToggle /></div></header><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Administrator</p><h1 className="mt-2 font-display text-3xl font-bold">{complaintsOpen ? "Complaints" : coursesOpen ? "Courses" : yearOpen ? "Academic year" : announcementsOpen ? "Announcements" : categoryTitle ?? "Dashboard"}</h1><p className="mt-2 text-sm text-muted-foreground">{complaintsOpen ? "Review and resolve student complaints." : coursesOpen ? "Manage subjects, teachers and attendance start dates." : yearOpen ? "Manage the school’s current academic year." : announcementsOpen ? "Publish updates for the school community." : category ? "View and manage school accounts." : "School account overview."}</p></div>{category && <Button onClick={startCreate}><UserPlus />Add {category === "admin" ? "admin" : category}</Button>}</div>
    {error && <p role="alert" className="mt-5 rounded-lg bg-danger-soft p-4 text-sm text-destructive">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg bg-success-soft p-4 text-sm text-success">{message}</p>}
    {!category && !announcementsOpen && !yearOpen && !coursesOpen && !complaintsOpen && <AdminDashboardSummary />}
    {announcementsOpen && <AnnouncementManager />}
    {yearOpen && <AcademicYearManager onChanged={() => { void reloadAcademicOptions().catch(() => setError("Unable to refresh class options.")); }} />}
    {coursesOpen && <CourseWorkspace role="admin" />}
    {complaintsOpen && <Complaints admin />}
    {category && <AccountDirectory key={category} role={category} items={items} total={total} page={page} loading={loading} year={year} classes={classes} currentUserId={currentUserId} filters={filters} onFilters={next => { setFilters(next); setPage(1); }} onPage={setPage} onEdit={startEdit} onReset={account => { setPassword(""); setResetting(account); setFormError(""); setMessage(""); setError(""); }} onStatus={changeStatus} onRemove={account => { setRemoving(account); setError(""); setMessage(""); }} />}
    {removing && <ConfirmationModal
      title="Remove student?"
      description="This student will be removed from the account list and will no longer be able to sign in. Their school records will be preserved."
      confirmLabel="Remove student"
      onConfirm={() => removeStudent(removing)}
      onClose={() => setRemoving(null)}
    >
      <p className="break-words font-semibold">{removing.name}</p>
      <p className="mt-1 break-all text-muted-foreground">{removing.email}</p>
      {removing.student?.admissionNo && <p className="mt-2 text-xs text-muted-foreground">Admission no. {removing.student.admissionNo}</p>}
    </ConfirmationModal>}
    {formOpen && category && (
      <FormModal
        title={editing ? "Edit student" : `Add ${category}`}
        description={editing ? "Update identity and current-year enrollment." : "Create an account with a password you choose."}
        formId="admin-account-form"
        submitLabel={saving ? "Saving…" : preparingSections ? "Preparing sections…" : editing ? "Save changes" : "Create account"}
        busy={saving || preparingSections}
        error={formError}
        onClose={() => { setFormOpen(false); setEditing(null); setFormError(""); clearForm(); }}
      >
        <form id="admin-account-form" onSubmit={saveAccount}>
          <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
            {category === 'student' && !editing && <><label className="grid gap-2 text-sm font-semibold">Parent name<Input required maxLength={120} value={parentName} onChange={e => setParentName(e.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Parent phone number<Input type="tel" required maxLength={40} value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></label></>}
            {category === 'parent' && <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Child student ID<Input required value={studentCode} onChange={e => setStudentCode(e.target.value)} placeholder="high-cs-11-0001-A" /><span className="text-xs font-normal text-muted-foreground">Copy the generated student ID from the student account details.</span></label>}
            {(category === "student" || category === "teacher") && <StudentPhotoInput label="Profile photo" file={photo} onChange={setPhoto} currentPhoto={editing?.student?.photo} name={name} disabled={saving || preparingSections} />}
            <label className="grid gap-2 text-sm font-semibold">Full name<Input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Email<Input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>{!editing && <label className="grid gap-2 text-sm font-semibold">Password<Input type="password" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>}{category === "student" && <><label className="grid gap-2 text-sm font-semibold">Admission number<Input required maxLength={80} value={admissionNo} onChange={event => setAdmissionNo(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Admission date<Input type="date" value={admissionDate} onChange={event => setAdmissionDate(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Date of birth<Input type="date" required value={dob} onChange={event => setDob(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Gender<select className="h-11 rounded-md border bg-background px-3" value={gender} onChange={event => setGender(event.target.value)}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label><label className="grid gap-2 text-sm font-semibold">Wing<select required className="h-11 rounded-md border bg-background px-3" value={wing} onChange={event => { setWing(event.target.value as Wing | ""); setClassId(""); setStudentStream(""); setSectionId(""); }}><option value="">Select wing</option><option value="primary">Primary (classes 1–8)</option><option value="secondary">Secondary (classes 9–10)</option><option value="higher">Higher (classes 11–12)</option></select></label>{wing && <label className="grid gap-2 text-sm font-semibold">Class<select required className="h-11 rounded-md border bg-background px-3" value={classId} disabled={preparingSections} onChange={event => { setClassId(event.target.value); setStudentStream(""); setSectionId(""); }}><option value="">{year ? "Select class" : "No current academic year"}</option>{wingClasses.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}{classId && wing !== "primary" && <label className="grid gap-2 text-sm font-semibold">Stream<select required className="h-11 rounded-md border bg-background px-3" value={studentStream} onChange={event => { setStudentStream(event.target.value); setSectionId(""); }}><option value="">Select stream</option>{schoolStreams.map(stream => <option key={stream}>{stream}</option>)}</select></label>}{classId && (wing === "primary" || studentStream) && <label className="grid gap-2 text-sm font-semibold">Section<select required className="h-11 rounded-md border bg-background px-3" value={sectionId} onChange={event => setSectionId(event.target.value)}><option value="">Select section</option>{availableSections.map(item => <option key={item._id} value={item._id}>{item.name.slice(-1)}</option>)}</select></label>}</>}{category === "teacher" && <><label className="grid gap-2 text-sm font-semibold">Employee ID<Input required maxLength={80} value={employeeId} onChange={event => setEmployeeId(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Wing<select required className="h-11 rounded-md border bg-background px-3" value={wing} onChange={event => { setWing(event.target.value as Wing | ""); setTeacherSections([]); setTeacherClass(""); setTeacherStream(""); }}><option value="">Select wing</option><option value="primary">Primary (classes 1–8)</option><option value="secondary">Secondary (classes 9–10)</option><option value="higher">Higher (classes 11–12)</option></select></label>{wing && <label className="grid gap-2 text-sm font-semibold">Class<select className="h-11 rounded-md border bg-background px-3" value={teacherClass} disabled={preparingSections} onChange={event => { setTeacherClass(event.target.value); setTeacherStream(""); }}><option value="">{preparingSections ? "Preparing classes…" : "Select class"}</option>{wingClasses.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}{teacherClass && wing !== "primary" && <label className="grid gap-2 text-sm font-semibold">Stream<select className="h-11 rounded-md border bg-background px-3" value={teacherStream} onChange={event => setTeacherStream(event.target.value)}><option value="">Select stream</option>{["Pre-Engineering", "Computer Science", "Medical", "Humanities"].map(stream => <option key={stream} value={stream}>{stream}</option>)}</select></label>}{teacherClass && (wing === "primary" || teacherStream) && <fieldset className="rounded-lg border p-4 sm:col-span-2"><legend className="px-1 text-sm font-semibold">Sections · {selectedClass?.name}{teacherStream ? ` · ${teacherStream}` : ""}</legend><div className="flex flex-wrap gap-4">{selectableSections.map(section => <label key={section._id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={teacherSections.includes(section._id)} onChange={event => setTeacherSections(current => event.target.checked ? [...current, section._id] : current.filter(id => id !== section._id))} />{section.name.slice(-1)}</label>)}</div>{!selectableSections.length && <p className="text-sm text-muted-foreground">Sections are unavailable. Select a current academic year and try again.</p>}</fieldset>}
            {teacherClass && (wing === "primary" || teacherStream) && <TeacherSubjectPicker className={selectedClass?.name ?? "Class"} stream={wing === "primary" ? "" : teacherStream} subjects={visibleSubjectOptions} selected={teacherSubjects} hasSections={selectedVisibleSections.length > 0} onChange={(subject, checked) => setTeacherSubjects(current => checked ? Array.from(new Set([...current, subject])) : current.filter(name => name !== subject))} />}
            <div className="text-sm text-muted-foreground sm:col-span-2">{teacherSections.length} section(s) selected. You can select sections from multiple classes in this wing.{teacherSections.length > 0 && <p className="mt-2">{classes.flatMap(item => item.sections.filter(section => teacherSections.includes(section._id)).map(section => `${item.name} · ${section.name}`)).join(", ")}</p>}{!year && " Select a current academic year first."}</div></>}
          </fieldset>
        </form>
        {category === "student" && !classes.length && <p className="mt-4 text-xs text-muted-foreground">Create a current academic year, class, and section before assigning enrollment.</p>}
      </FormModal>
    )}
    {resetting && (
      <FormModal
        title={`Reset password for ${resetting.name}`}
        description="Existing passwords cannot be viewed. Set a new one and share it securely."
        formId="admin-password-form"
        submitLabel={saving ? "Resetting…" : "Reset password"}
        busy={saving}
        error={formError}
        onClose={() => { setResetting(null); setPassword(""); setFormError(""); }}
      >
        <form id="admin-password-form" onSubmit={resetPassword}>
          <label className="grid gap-2 text-sm font-semibold">New password<Input required disabled={saving} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        </form>
      </FormModal>
    )}
    </main></div></div>;
}


