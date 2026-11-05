"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Paperclip, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Audience = "student" | "teacher" | "parent" | "all";
type Announcement = { _id: string; title: string; body: string; audience: Audience; createdAt: string; updatedAt: string; expiresAt: string; isRead: boolean; attachment?: { name: string; contentType: string } };
const audiences: { value: Audience; label: string }[] = [{ value: "student", label: "Students" }, { value: "teacher", label: "Teachers" }, { value: "parent", label: "Parents" }, { value: "all", label: "Everyone" }];

async function download(item: Announcement) {
  const response = await api.get(`/announcements/${item._id}/attachment`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.attachment?.name || "attachment";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function AnnouncementBell() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!localStorage.getItem("educore-access-token")) return;
    try { const { data } = await api.get("/announcements"); setItems(data.data.items); setUnread(data.data.unread); setError(""); }
    catch { setError("Unable to load announcements."); }
  }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(refresh, 10000); const onFocus = () => { void refresh(); }; window.addEventListener("focus", onFocus); window.addEventListener("announcements-read", onFocus); return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); window.removeEventListener("announcements-read", onFocus); }; }, [refresh]);
  async function markRead(item: Announcement) {
    if (item.isRead) return;
    try { await api.post(`/announcements/${item._id}/read`); await refresh(); }
    catch { setError("Unable to mark announcement as read."); }
  }
  return <div className="relative"><button type="button" onClick={() => { setOpen(!open); if (!open) void refresh(); }} className="relative grid size-10 place-items-center rounded-md hover:bg-muted" aria-label={`Announcements${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}><Bell className="size-5" />{unread > 0 && <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}</button>{open && <div className="fixed inset-x-3 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-xl border bg-background p-4 shadow-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-96" role="region" aria-label="Announcements"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Announcements</h2><button aria-label="Close announcements" onClick={() => setOpen(false)} className="p-2"><X className="size-4" /></button></div>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}{!error && items.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No current announcements.</p>}<div className="mt-3 space-y-3">{items.map(item => <article key={item._id} className="rounded-lg border p-4"><button className="w-full text-start" onClick={() => void markRead(item)}><span className="flex items-center gap-2 font-semibold">{!item.isRead && <span className="size-2 rounded-full bg-primary" />} {item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.isRead ? "Read" : "New — select to mark read"}</span></button><p className="mt-3 whitespace-pre-wrap text-sm">{item.body}</p>{item.attachment?.name && <button className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary underline" onClick={() => { void download(item).catch(() => setError("Unable to open attachment.")); void markRead(item); }}><Paperclip className="size-4" />{item.attachment.name}</button>}</article>)}</div></div>}</div>;
}

function AnnouncementAttachment({ item }: { item: Announcement }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    api.get(`/announcements/${item._id}/attachment`, { responseType: "blob" }).then(async ({ data }) => {
      if (!active) return;
      if (item.attachment?.contentType === "text/plain") {
        const content = await (data as Blob).text();
        if (active) setText(content);
      } else {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      }
    }).catch(() => { if (active) setError("Unable to load attachment. It may have expired."); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item._id, item.attachment?.contentType]);
  if (error) return <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>;
  if (item.attachment?.contentType === "text/plain") return <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">{text ?? "Loading attachment…"}</pre>;
  if (!url) return <p className="mt-3 text-sm text-muted-foreground">Loading attachment…</p>;
  if (item.attachment?.contentType.startsWith("image/")) return <img className="mt-3 max-h-[600px] max-w-full rounded-lg border object-contain" src={url} alt={item.attachment.name || "Announcement attachment"} />;
  return <iframe className="mt-3 h-[600px] w-full rounded-lg border" src={url} title={item.attachment?.name || "Announcement PDF"} />;
}

export function StudentAnnouncements({ language = "en" }: { language?: "en" | "ur" }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { const { data } = await api.get("/announcements"); setItems(data.data.items); setError(""); }
    catch { setError(language === "ur" ? "اعلانات لوڈ نہیں ہو سکے۔" : "Unable to load announcements."); }
    finally { setLoading(false); }
  }, [language]);
  useEffect(() => { void refresh(); const timer = window.setInterval(refresh, 10000); return () => window.clearInterval(timer); }, [refresh]);
  async function toggle(item: Announcement) {
    if (open === item._id) { setOpen(null); return; }
    setOpen(item._id);
    if (!item.isRead) {
      try { await api.post(`/announcements/${item._id}/read`); setItems(current => current.map(entry => entry._id === item._id ? { ...entry, isRead: true } : entry)); window.dispatchEvent(new Event("announcements-read")); }
      catch { setError(language === "ur" ? "اعلان پڑھا ہوا نشان زد نہیں ہو سکا۔" : "Unable to mark the announcement as read."); }
    }
  }
  return <div className="mt-8 space-y-3">{loading && <p role="status" className="text-sm text-muted-foreground">{language === "ur" ? "اعلانات لوڈ ہو رہے ہیں…" : "Loading announcements…"}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{!loading && !error && !items.length && <Card className="p-8 text-sm text-muted-foreground">{language === "ur" ? "ابھی کوئی اعلان نہیں ہے۔" : "There are no current announcements."}</Card>}{items.map(item => <Card key={item._id} className="p-5"><button type="button" className="w-full text-start" aria-expanded={open === item._id} onClick={() => void toggle(item)}><span className="flex items-center gap-2 font-semibold">{!item.isRead && <span className="size-2 rounded-full bg-primary" />}{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {open === item._id ? (language === "ur" ? "بند کریں" : "Close") : (language === "ur" ? "کھولیں" : "Open")}</span></button>{open === item._id && <div><p className="mt-4 whitespace-pre-wrap text-sm">{item.body}</p>{item.attachment?.name && <div className="mt-4"><p className="text-sm font-semibold"><Paperclip className="me-2 inline size-4" />{item.attachment.name}</p><AnnouncementAttachment key={item.updatedAt} item={item} /><button className="mt-3 text-sm font-semibold text-primary underline" onClick={() => void download(item).catch(() => setError("Unable to download attachment."))}>{language === "ur" ? "ڈاؤن لوڈ کریں" : "Download attachment"}</button></div>}</div>}</Card>)}</div>;
}

export function AnnouncementManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [audience, setAudience] = useState<Audience>("student");
  const [file, setFile] = useState<File | null>(null); const [fileKey, setFileKey] = useState(0);
  const [removeFile, setRemoveFile] = useState(false); const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const refresh = useCallback(async () => { try { const { data } = await api.get("/announcements"); setItems(data.data.items); } catch { setError("Unable to load announcements."); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  function clear() { setTitle(""); setBody(""); setAudience("student"); setFile(null); setFileKey(key => key + 1); setRemoveFile(false); setEditing(null); }
  function edit(item: Announcement) { setEditing(item); setTitle(item.title); setBody(item.body); setAudience(item.audience); setFile(null); setFileKey(key => key + 1); setRemoveFile(false); setError(""); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (file && file.size > 8 * 1024 * 1024) { setError("Files must be 8 MB or smaller."); return; }
    const data = new FormData(); data.append("title", title); data.append("body", body); data.append("audience", audience); if (file) data.append("file", file); if (removeFile) data.append("removeAttachment", "true");
    setSaving(true);
    try { await api.request({ method: editing ? "patch" : "post", url: editing ? `/announcements/${editing._id}` : "/announcements", data, headers: { "Content-Type": "multipart/form-data" } }); setMessage(editing ? "Announcement updated." : "Announcement published."); clear(); await refresh(); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to save announcement."); }
    finally { setSaving(false); }
  }
  async function remove(item: Announcement) { if (!window.confirm(`Delete “${item.title}” for everyone?`)) return; try { await api.delete(`/announcements/${item._id}`); if (editing?._id === item._id) clear(); setMessage("Announcement deleted."); await refresh(); } catch { setError("Unable to delete announcement."); } }
  return <div className="mt-7 space-y-6"><Card className="p-6"><h2 className="font-display text-xl font-bold">{editing ? "Edit announcement" : "Create announcement"}</h2><p className="mt-2 text-sm text-muted-foreground">Announcements and attachments expire 48 hours after they are published. Editing does not extend this time.</p><form onSubmit={submit} className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-semibold">Audience<select className="h-11 rounded-md border bg-background px-3" value={audience} onChange={e => setAudience(e.target.value as Audience)}>{audiences.map(option => <option key={option.value} value={option.value}>Announce for {option.label.toLowerCase()}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Title<Input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Message<textarea required maxLength={10000} rows={5} className="rounded-md border bg-background p-3 font-normal" value={body} onChange={e => setBody(e.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Attachment <span className="font-normal text-muted-foreground">Optional: PDF, PNG, JPEG, WebP or text, up to 8 MB</span><Input key={fileKey} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>{editing?.attachment?.name && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={removeFile} onChange={e => setRemoveFile(e.target.checked)} />Remove current attachment: {editing.attachment.name}</label>}<div className="flex gap-3"><Button disabled={saving} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "Publish announcement"}</Button>{editing && <Button type="button" variant="outline" onClick={clear}>Cancel edit</Button>}</div></form>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-success">{message}</p>}</Card><div><h2 className="font-display text-xl font-bold">Current announcements</h2>{items.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No current announcements.</p>}<div className="mt-4 space-y-3">{items.map(item => <Card key={item._id} className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">For {audiences.find(option => option.value === item.audience)?.label.toLowerCase()} · Expires {new Date(item.expiresAt).toLocaleString()}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(item)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => void remove(item)}>Delete</Button></div></div><p className="mt-3 whitespace-pre-wrap text-sm">{item.body}</p>{item.attachment?.name && <button className="mt-3 text-sm font-semibold text-primary underline" onClick={() => void download(item).catch(() => setError("Unable to open attachment."))}>{item.attachment.name}</button>}</Card>)}</div></div></div>;
}
