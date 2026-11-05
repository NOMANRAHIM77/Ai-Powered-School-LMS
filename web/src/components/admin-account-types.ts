export type Role = "student" | "teacher" | "parent" | "admin";
export type Wing = "primary" | "secondary" | "higher";
export type Account = { attendance?: { attended: number; total: number; percentage: number }; linkedStudents?: { name: string; studentCode?: string }[]; _id: string; name: string; email: string; role?: Role; isActive: boolean; student?: { studentCode?: string; parentName?: string; parentPhone?: string; admissionNo: string; admissionDate?: string; dob: string; gender: string; phone?: string; address?: string; photo?: string }; teacher?: { photo?: string; employeeId: string; wing?: Wing; subjectNames?: string[]; assignmentAcademicYearId?: { name: string }; sectionIds: { _id: string; name: string; classId?: { name: string } }[] } | null; enrollment?: { admissionDate: string; classId: string; className: string; sectionId: string; sectionName: string; academicYear: string } | null };
export type SchoolClass = { _id: string; name: string; wing: Wing | null; sections: { _id: string; name: string; subjectNames?: string[] }[] };
export type AccountFilters = { smart: string; search: string; status: string; wing: string; classId: string; stream: string; sectionId: string; gender: string; sort: string; limit: string };
export const emptyAccountFilters: AccountFilters = { smart: "", search: "", status: "", wing: "", classId: "", stream: "", sectionId: "", gender: "", sort: "newest", limit: "20" };
export const schoolStreams = ["Pre-Engineering", "Computer Science", "Medical", "Humanities"];

