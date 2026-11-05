"use client";
import { FamilyChat } from '@/components/family-chat';
import { useCurrentRole } from '@/components/app-shell';
export default function ChatPage() { const { role } = useCurrentRole(); return role === 'parent' || role === 'teacher' ? <FamilyChat role={role} /> : <p>Chat is available to teachers and parents.</p>; }
