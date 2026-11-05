"use client";
import { TeacherProfile } from "@/components/teacher-profile";
import { useCurrentRole } from "@/components/app-shell";

import { Bell, Building2, CheckCircle2, LockKeyhole, Palette, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const tabs = [{ label: "School profile", icon: Building2 }, { label: "My profile", icon: UserRound }, { label: "Notifications", icon: Bell }, { label: "Appearance", icon: Palette }, { label: "Security", icon: LockKeyhole }];

export default function SettingsPage() {
  const [tab, setTab] = useState("School profile"); const [saved, setSaved] = useState(false);
  const { role } = useCurrentRole(); if (role === "teacher") return <TeacherProfile />;
  return <><PageHeader title="Settings" subtitle="Manage school information, preferences, notifications, and security." /><div className="grid gap-6 lg:grid-cols-[240px_1fr]"><Card className="h-fit p-2">{tabs.map((item) => <button className={cn("flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium", tab === item.label ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")} key={item.label} onClick={() => setTab(item.label)}><item.icon className="size-4" />{item.label}</button>)}</Card><Card><CardContent className="p-6 sm:p-8"><h2 className="font-display text-xl font-bold">{tab}</h2><p className="mt-1 text-sm text-muted-foreground">Update the information used throughout EduCore.</p>{tab === "School profile" ? <div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">School name<Input defaultValue="Bright Future Academy" /></label><label className="grid gap-2 text-sm font-semibold">School email<Input defaultValue="info@educore.edu.pk" type="email" /></label><label className="grid gap-2 text-sm font-semibold">Phone number<Input defaultValue="+92 21 12345678" /></label><label className="grid gap-2 text-sm font-semibold">Website<Input defaultValue="www.educore.edu.pk" /></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Address<Input defaultValue="123 Education Road, Karachi, Pakistan" /></label><label className="grid gap-2 text-sm font-semibold">Timezone<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>Asia/Karachi (UTC+5)</option></select></label><label className="grid gap-2 text-sm font-semibold">Currency<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>PKR — Pakistani Rupee</option></select></label></div> : <div className="mt-7 space-y-4">{["Email notifications", "In-app reminders", "Weekly digest", "Low attendance alerts"].map((setting, index) => <label className="flex items-center justify-between rounded-lg border p-4" key={setting}><span><span className="block text-sm font-semibold">{setting}</span><span className="mt-1 block text-xs text-muted-foreground">Control updates for {setting.toLowerCase()}.</span></span><input className="size-5 accent-primary" defaultChecked={index < 3} type="checkbox" /></label>)}</div>}<div className="mt-8 flex items-center justify-end gap-3 border-t pt-6">{saved && <span className="flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="size-4" />Changes saved</span>}<Button onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 3000); }}><Save />Save changes</Button></div></CardContent></Card></div></>;
}

