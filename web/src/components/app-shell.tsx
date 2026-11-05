"use client";

import { BarChart3, Bell, BookOpenCheck, CalendarCheck2, ChevronLeft, ClipboardCheck, Command, GraduationCap, LayoutDashboard, Menu, Search, Settings2, TableProperties, Users, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import { TeacherProfileMenu } from "@/components/teacher-profile";
import { AnnouncementBell } from "@/components/announcements";
import { AcademicYearBadge } from "@/components/academic-year";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { currentUser, type Role } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; roles: Role[] };
const navItems: NavItem[] = [
  { label: "My profile", href: "/profile", icon: Users, roles: ["teacher"] },
  { label: "Chat", href: "/chat", icon: Users, roles: ["teacher", "parent"] },
  { label: "My courses", href: "/courses", icon: BookOpenCheck, roles: ["admin", "teacher", "parent"] },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "parent"] },
  { label: "Students", href: "/students", icon: GraduationCap, roles: ["admin", "teacher"] },
  { label: "Teachers", href: "/teachers", icon: Users, roles: ["admin"] },
  { label: "Academics", href: "/academics", icon: BookOpenCheck, roles: ["admin"] },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck2, roles: ["admin", "teacher", "student", "parent"] },
  { label: "Fees", href: "/fees", icon: WalletCards, roles: ["admin", "student", "parent"] },
  { label: "Results", href: "/marks", icon: ClipboardCheck, roles: ["admin", "teacher", "student", "parent"] },
  { label: "Timetable", href: "/timetable", icon: TableProperties, roles: ["admin", "teacher", "student", "parent"] },
  { label: "Announcements", href: "/announcements", icon: Bell, roles: ["admin", "teacher", "student", "parent"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin"] },
];

const RoleContext = createContext<{ role: Role; setRole: (role: Role) => void }>({ role: "admin", setRole: () => undefined });
export function useCurrentRole() { return useContext(RoleContext); }

function Sidebar({ collapsed, setCollapsed, mobile, onNavigate }: { collapsed: boolean; setCollapsed: (value: boolean) => void; mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useCurrentRole();
  const items = navItems.filter((item) => item.roles.includes(role));
  return <aside className={cn("flex h-full flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200", collapsed && !mobile ? "w-[72px]" : "w-64")}>
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpenCheck aria-hidden="true" className="size-5" /></span>{(!collapsed || mobile) && <div className="min-w-0"><p className="truncate font-display text-sm font-bold">EduCore</p><p className="truncate text-xs text-muted-foreground">School Management</p></div>}</div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary navigation">{items.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)); return <Link aria-current={active ? "page" : undefined} className={cn("relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-secondary", collapsed && !mobile && "justify-center px-0")} href={item.href} key={item.href} onClick={onNavigate} title={collapsed && !mobile ? item.label : undefined}>{active && <span className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-primary" />}<Icon aria-hidden="true" className="size-5 shrink-0" />{(!collapsed || mobile) && <span>{item.label}</span>}</Link>; })}</nav>
    <div className="border-t border-sidebar-border p-3"><Link className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-secondary", collapsed && !mobile && "justify-center px-0")} href="/settings"><Settings2 aria-hidden="true" className="size-5" />{(!collapsed || mobile) && "Settings"}</Link><LogoutButton compact={collapsed && !mobile} />{!mobile && <button className="mt-2 flex min-h-10 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setCollapsed(!collapsed)} type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft aria-hidden="true" className={cn("size-4 transition-transform", collapsed && "rotate-180")} /></button>}</div>
  </aside>;
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter(); const { role } = useCurrentRole(); const [query, setQuery] = useState("");
  const items = navItems.filter((item) => item.roles.includes(role) && item.label.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/35 p-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={onClose}><div className="w-full max-w-xl overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl" role="dialog" aria-modal="true" aria-label="Quick navigation" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b p-4"><Search aria-hidden="true" className="size-5 text-muted-foreground" /><input autoFocus className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder="Search pages and actions…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd className="rounded border bg-muted px-2 py-1 text-xs text-muted-foreground">Esc</kbd></div><div className="max-h-80 overflow-y-auto p-2">{items.map((item) => <button className="flex w-full items-center gap-3 rounded-md p-3 text-start text-sm hover:bg-accent" key={item.href} onClick={() => { router.push(item.href); onClose(); }} type="button"><item.icon aria-hidden="true" className="size-4 text-muted-foreground" /><span className="font-medium">{item.label}</span><span className="ms-auto text-xs text-muted-foreground">Open page</span></button>)}{!items.length && <p className="p-8 text-center text-sm text-muted-foreground">No matching pages.</p>}</div></div></div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<{ name: string } | null>(null);
  const [accountError, setAccountError] = useState('');
  useEffect(() => { let live = true; api.get('/auth/me').then(({ data }) => { if (live) { setAccount(data.data); setRoleState(data.data.role); } }).catch(err => { if (live) { if (err.response?.status === 401) router.replace('/'); else setAccountError('Unable to load your account. Refresh the page to retry.'); } }); return () => { live = false; }; }, [router]);
  const pathname = usePathname(); const [role, setRoleState] = useState<Role>("admin"); const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => { const saved = window.localStorage.getItem("educore-role") as Role | null; if (saved && ["admin", "teacher", "student", "parent"].includes(saved)) setRoleState(saved); }, []);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); } if (event.key === "Escape") { setCommandOpen(false); setMobileOpen(false); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const setRole = (nextRole: Role) => { setRoleState(nextRole); window.localStorage.setItem("educore-role", nextRole); };
  const mobileItems = useMemo(() => navItems.filter((item) => item.roles.includes(role)).slice(0, 4), [role]);
  return <RoleContext.Provider value={{ role, setRole }}><div className="min-h-screen bg-background"><div className="fixed inset-y-0 start-0 z-30 hidden lg:block"><Sidebar collapsed={collapsed} setCollapsed={setCollapsed} /></div>{mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} role="presentation"><div className="h-full w-64" onClick={(event) => event.stopPropagation()}><Sidebar collapsed={false} mobile setCollapsed={() => undefined} onNavigate={() => setMobileOpen(false)} /></div></div>}
    <div className={cn("transition-[padding] duration-200", collapsed ? "lg:ps-[72px]" : "lg:ps-64")}><header className="sticky top-0 z-20 h-16 border-b bg-background/90 backdrop-blur-xl"><div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8"><Button className="lg:hidden" onClick={() => setMobileOpen(true)} size="icon" variant="ghost"><Menu aria-hidden="true" /><span className="sr-only">Open navigation</span></Button><button className="hidden h-10 max-w-md flex-1 items-center gap-3 rounded-md border bg-secondary/60 px-3 text-sm text-muted-foreground hover:bg-secondary sm:flex" onClick={() => setCommandOpen(true)} type="button"><Search aria-hidden="true" className="size-4" /><span className="truncate">Search students, classes, pages…</span><kbd className="ms-auto rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium"><Command aria-hidden="true" className="inline size-3" /> K</kbd></button><div className="ms-auto flex items-center gap-2"><AcademicYearBadge /><AnnouncementBell /><ThemeToggle /><div className="hidden items-center gap-2 border-s ps-3 sm:flex">{role === "teacher" ? <TeacherProfileMenu /> : <AvatarWithFallback className="size-9" initials={account?.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("") ?? "?"} />}{role !== "teacher" && <div className="hidden xl:block"><p className="text-xs font-semibold leading-none">{account?.name ?? "Loading…"}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{role}</p></div>}</div></div></div></header><main className={cn("mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8", (role === "student" || role === "parent") && "pb-24 lg:pb-8")}>{account ? children : <p role="status">{accountError || "Loading your workspace…"}</p>}</main></div>
    {(role === "student" || role === "parent") && <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-card px-2 lg:hidden" aria-label="Mobile navigation">{mobileItems.map((item) => { const active = pathname === item.href; return <Link className={cn("flex min-w-16 flex-col items-center gap-1 rounded-md py-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")} href={item.href} key={item.href}><item.icon aria-hidden="true" className="size-5" />{item.label}</Link>; })}<button className="flex min-w-16 flex-col items-center gap-1 py-1 text-[11px] font-medium text-muted-foreground" onClick={() => setMobileOpen(true)} type="button"><Menu aria-hidden="true" className="size-5" />More</button></nav>}<CommandPalette onClose={() => setCommandOpen(false)} open={commandOpen} /></div></RoleContext.Provider>;
}



