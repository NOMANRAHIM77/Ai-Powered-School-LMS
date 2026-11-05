"use client";
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { ChevronDown, UserRound } from 'lucide-react';
import { StudentAvatar } from '@/components/student-photo';
export function StudentProfileMenu({ name, photo, onProfile }: { name: string; photo?: string; onProfile: () => void }) {
  return <Dropdown.Root><Dropdown.Trigger className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted" aria-label={`Open profile menu for ${name}`}><StudentAvatar name={name} photo={photo} className="size-9 rounded-full text-sm" /><span className="max-w-16 truncate text-xs font-semibold sm:max-w-44 sm:text-sm">{name}</span><ChevronDown className="size-4 shrink-0" /></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content align="end" sideOffset={8} className="z-50 min-w-48 rounded-lg border bg-popover p-1 shadow-xl"><Dropdown.Item className="flex cursor-pointer items-center gap-2 rounded-md p-3 text-sm outline-none focus:bg-accent" onSelect={onProfile}><UserRound className="size-4" />View full profile</Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root>;
}
