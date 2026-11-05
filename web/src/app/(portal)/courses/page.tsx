"use client";
import { ParentWorkspace } from "@/components/parent-workspace";
import { CourseWorkspace } from '@/components/course-workspace';
import { useCurrentRole } from '@/components/app-shell';
export default function CoursesPage() {
  const { role } = useCurrentRole();
  if (role === 'parent') return <ParentWorkspace />; return role === 'teacher' || role === 'admin' || role === 'student' ? <CourseWorkspace role={role} /> : <p>Courses are available in the student and teacher portals.</p>;
}

