"use client";
import { TeacherProfile } from '@/components/teacher-profile';
import { useCurrentRole } from '@/components/app-shell';
export default function ProfilePage(){const {role}=useCurrentRole();return role==='teacher'?<TeacherProfile/>:<p>Open your profile from your portal.</p>;}
