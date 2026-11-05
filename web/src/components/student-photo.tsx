"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function photoUrl(photo?: string) {
  if (!photo) return undefined;
  const value = photo.trim();
  if (/^(data:image\/|blob:)/i.test(value)) return value;
  const legacy = value.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.*)$/i);
  if (legacy) return `${(api.defaults.baseURL ?? 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${legacy[1]}`;
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = value.replace(/\\/g, '/');
  if (/^\/?uploads\//.test(normalized)) return `${(api.defaults.baseURL ?? 'http://localhost:5000/api').replace(/\/api\/?$/, '')}/${normalized.replace(/^\//, '')}`;
  return value;
}

export function StudentAvatar({ photo, name, className }: { photo?: string; name: string; className?: string }) {
  const src = photoUrl(photo);
  const [failed, setFailed] = useState<string>();
  useEffect(() => { setFailed(undefined); }, [src]);
  return <span className={cn("relative inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-accent text-lg font-bold text-accent-foreground", className)}>
    {src && failed !== src
      // eslint-disable-next-line @next/next/no-img-element
      ? <img key={src} src={src} alt={`${name || 'Student'} photo`} className="absolute inset-0 block h-full w-full object-cover" onError={() => setFailed(src)} />
      : <span aria-label={`${name || 'Student'} initials`}>{name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?'}</span>}
  </span>;
}

export function StudentPhotoInput({ file, onChange, currentPhoto, name, disabled, label = 'Student photo' }: {
  file: File | null; onChange: (file: File | null) => void; currentPhoto?: string; name: string; disabled: boolean; label?: string;
}) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState('');
  const [inputKey, setInputKey] = useState(0);
  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const reader = new FileReader();
    let live = true;
    reader.onload = () => { if (live) setPreview(String(reader.result)); };
    reader.onerror = () => { if (live) setError('Unable to preview this photo. Please select it again.'); };
    reader.readAsDataURL(file);
    return () => { live = false; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [file]);
  return <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:col-span-2 sm:flex-row sm:items-center">
    <StudentAvatar photo={preview ?? currentPhoto} name={name} className="size-24" />
    <div className="min-w-0 flex-1 space-y-2">
      <label className="grid gap-2 text-sm font-semibold">{label} <span className="font-normal text-muted-foreground">Optional · JPG, PNG or WebP · up to 5 MB</span>
        <Input key={inputKey} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="h-auto py-2 text-xs" onChange={event => {
          const selected = event.target.files?.[0]; setError('');
          if (!selected) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
            setError('Choose a JPG, PNG or WebP image of 5 MB or smaller.'); onChange(null); event.target.value = ''; return;
          }
          onChange(selected);
        }} />
      </label>
      <p className="text-xs text-muted-foreground">{currentPhoto ? 'Choose a new image to replace the current photo.' : 'You can save without a photo.'}</p>
      {file && <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => { onChange(null); setInputKey(value => value + 1); setError(''); }}>Clear selected photo</Button>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </div>;
}
