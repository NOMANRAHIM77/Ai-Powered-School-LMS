export type Role = "admin" | "teacher" | "student" | "parent";

export const currentUser = {
  name: "Noman Ahmed",
  email: "principal@educore.edu.pk",
  role: "admin" as Role,
  initials: "NA",
};

export const students = [
  { id: "ST-001", name: "Ayesha Khan", admission: "ADM-2024-001", roll: "08-A-01", className: "Grade 8-A", guardian: "Farhan Khan", phone: "+92 300 1234567", attendance: 96, fee: "paid", status: "active", initials: "AK" },
  { id: "ST-002", name: "Hamza Siddiqui", admission: "ADM-2024-014", roll: "08-A-02", className: "Grade 8-A", guardian: "Mariam Siddiqui", phone: "+92 321 8765432", attendance: 88, fee: "partial", status: "active", initials: "HS" },
  { id: "ST-003", name: "Zoya Williams", admission: "ADM-2023-089", roll: "08-A-03", className: "Grade 8-A", guardian: "Daniel Williams", phone: "+92 333 4567890", attendance: 91, fee: "paid", status: "active", initials: "ZW" },
  { id: "ST-004", name: "Ali Raza", admission: "ADM-2024-021", roll: "08-A-04", className: "Grade 8-A", guardian: "Sana Raza", phone: "+92 302 9876543", attendance: 72, fee: "overdue", status: "active", initials: "AR" },
  { id: "ST-005", name: "Noor Fatima", admission: "ADM-2022-112", roll: "09-B-08", className: "Grade 9-B", guardian: "Asif Mehmood", phone: "+92 315 1122334", attendance: 94, fee: "unpaid", status: "active", initials: "NF" },
  { id: "ST-006", name: "Omar Hassan", admission: "ADM-2024-033", roll: "07-C-11", className: "Grade 7-C", guardian: "Lina Hassan", phone: "+92 344 5544332", attendance: 83, fee: "paid", status: "inactive", initials: "OH" },
  { id: "ST-007", name: "Sara Ahmed", admission: "ADM-2021-074", roll: "10-A-06", className: "Grade 10-A", guardian: "Tariq Ahmed", phone: "+92 301 2255779", attendance: 98, fee: "waived", status: "active", initials: "SA" },
  { id: "ST-008", name: "Ethan Clarke", admission: "ADM-2023-046", roll: "06-B-17", className: "Grade 6-B", guardian: "Rachel Clarke", phone: "+92 320 9988112", attendance: 67, fee: "overdue", status: "withdrawn", initials: "EC" },
];

export const attendanceStudents = students.slice(0, 6).map((student, index) => ({
  ...student,
  status: index === 3 ? "absent" : index === 4 ? "late" : "present",
}));

export const notices = [
  { id: 1, title: "Parent–Teacher Conference", body: "The autumn parent–teacher conference will be held this Saturday from 9:00 AM to 1:00 PM. Please book a time slot with the class coordinator.", audience: "All school", date: "Today, 9:30 AM", pinned: true, unread: true, author: "Principal's Office" },
  { id: 2, title: "Science Fair registrations open", body: "Students in Grades 6–10 can submit their project proposals by 28 October. Teams may include up to three students.", audience: "Grades 6–10", date: "Yesterday", pinned: true, unread: true, author: "Dr. Sara Malik" },
  { id: 3, title: "Revised winter uniform schedule", body: "Winter uniform becomes mandatory from Monday, 4 November. The school store will remain open until 4:00 PM this week.", audience: "Students & parents", date: "21 Oct", pinned: false, unread: false, author: "Administration" },
  { id: 4, title: "Inter-school football trials", body: "Football trials for the U-16 team take place on Thursday after school at the main ground.", audience: "Grade 8-A", date: "20 Oct", pinned: false, unread: false, author: "Sports Department" },
];

export const timetable = [
  { time: "08:00", end: "08:45", monday: "Mathematics", tuesday: "English", wednesday: "Physics", thursday: "Mathematics", friday: "Computer" },
  { time: "08:50", end: "09:35", monday: "English", tuesday: "Chemistry", wednesday: "Mathematics", thursday: "Urdu", friday: "Islamiyat" },
  { time: "09:40", end: "10:25", monday: "Physics", tuesday: "Mathematics", wednesday: "English", thursday: "Chemistry", friday: "English" },
  { time: "10:45", end: "11:30", monday: "Computer", tuesday: "Pakistan Studies", wednesday: "Biology", thursday: "English", friday: "Mathematics" },
  { time: "11:35", end: "12:20", monday: "Urdu", tuesday: "Physics", wednesday: "Computer", thursday: "Biology", friday: "Physics" },
  { time: "12:25", end: "13:10", monday: "Islamiyat", tuesday: "P.E.", wednesday: "Urdu", thursday: "Computer", friday: "Class Hour" },
];

export const vouchers = [
  { id: "V-10241", student: "Ayesha Khan", className: "Grade 8-A", month: "October 2026", total: 18500, paid: 18500, due: "10 Oct", status: "paid" },
  { id: "V-10242", student: "Hamza Siddiqui", className: "Grade 8-A", month: "October 2026", total: 18500, paid: 10000, due: "10 Oct", status: "partial" },
  { id: "V-10243", student: "Ali Raza", className: "Grade 8-A", month: "October 2026", total: 18500, paid: 0, due: "10 Oct", status: "overdue" },
  { id: "V-10244", student: "Noor Fatima", className: "Grade 9-B", month: "October 2026", total: 20500, paid: 0, due: "10 Oct", status: "unpaid" },
  { id: "V-10245", student: "Sara Ahmed", className: "Grade 10-A", month: "October 2026", total: 22500, paid: 22500, due: "10 Oct", status: "paid" },
];

export const teachers = [
  { id: "T-017", name: "Dr. Sara Malik", subject: "Physics", classes: "8-A, 9-A, 10-A", phone: "+92 300 5550101", status: "active", initials: "SM" },
  { id: "T-022", name: "Bilal Mahmood", subject: "Mathematics", classes: "7-B, 8-A, 8-B", phone: "+92 321 5550102", status: "active", initials: "BM" },
  { id: "T-031", name: "Emma Thompson", subject: "English", classes: "6-A, 7-A, 8-A", phone: "+92 333 5550103", status: "active", initials: "ET" },
  { id: "T-009", name: "Usman Tariq", subject: "Computer Science", classes: "8-A, 9-B, 10-A", phone: "+92 302 5550104", status: "active", initials: "UT" },
];

export const activity = [
  { title: "Payment received", detail: "PKR 18,500 · Ayesha Khan", time: "8 min ago", tone: "success" },
  { title: "Attendance submitted", detail: "Grade 8-A · Dr. Sara Malik", time: "24 min ago", tone: "primary" },
  { title: "New student admitted", detail: "Omar Hassan · Grade 7-C", time: "1 hr ago", tone: "info" },
  { title: "Notice published", detail: "Parent–Teacher Conference", time: "2 hrs ago", tone: "warning" },
];

export const marksRows = students.slice(0, 6).map((student, index) => ({
  ...student,
  obtained: [87, 74, 92, 39, 81, 66][index],
}));

export const subjectTone: Record<string, string> = {
  Mathematics: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  English: "border-chart-2/25 bg-chart-2/10 text-chart-2",
  Physics: "border-chart-3/25 bg-chart-3/10 text-chart-3",
  Chemistry: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  Computer: "border-chart-5/25 bg-chart-5/10 text-chart-5",
  "Computer Science": "border-chart-5/25 bg-chart-5/10 text-chart-5",
  Urdu: "border-chart-6/25 bg-chart-6/10 text-chart-6",
  Biology: "border-success/25 bg-success-soft text-success",
  Islamiyat: "border-info/25 bg-info-soft text-info",
  "Pakistan Studies": "border-warning/25 bg-warning-soft text-warning",
  "P.E.": "border-muted bg-muted text-muted-foreground",
  "Class Hour": "border-muted bg-muted text-muted-foreground",
};
