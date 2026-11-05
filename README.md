# EduCore — AI School LMS

A school learning and administration application for **administrators, teachers, students and parents**, built with MongoDB, Express, React (Next.js), Node.js and TypeScript.

> Development project: core portal workflows are implemented. Some older generic reports, timetable and finance screens still contain demonstration data. This is not a certified production school system or a completed multi-tenant SaaS.

## Product preview

Browse the portals and AI tutor below. These screenshots use **synthetic demonstration data**, not private school records; AI answers and scores are illustrative. [View all feature screenshots](#screenshots).

### Choose a portal

![Choose a portal](docs/screenshots/role-selection.png)

Image: [role-selection.png](docs/screenshots/role-selection.png)

### Administrator dashboard

![Administrator dashboard](docs/screenshots/admin-dashboard.png)

Image: [admin-dashboard.png](docs/screenshots/admin-dashboard.png)

### Student dashboard

![Student dashboard](docs/screenshots/student-dashboard.png)

Image: [student-dashboard.png](docs/screenshots/student-dashboard.png)

### Teacher courses

![Teacher courses](docs/screenshots/teacher-course-overview.png)

Image: [teacher-course-overview.png](docs/screenshots/teacher-course-overview.png)

### Parent dashboard

![Parent dashboard](docs/screenshots/parent-dashboard.png)

Image: [parent-dashboard.png](docs/screenshots/parent-dashboard.png)

### AI tutor answers with source citations

![AI tutor answers with source citations](docs/screenshots/rag-answer-citations.png)

Image: [rag-answer-citations.png](docs/screenshots/rag-answer-citations.png)

## Portal flows

| Portal | Workflow |
|---|---|
| Admin | Sign in → academic year → manage accounts → assign wing/class/stream/sections/teacher subjects → courses and start dates → announcements and complaints. Natural-language searches filter records. |
| Teacher | Sign in → profile → assigned courses → roster, attendance, uploaded material, assignments, quizzes and grades. Review suggested quiz marks, edit and approve publication. Chat with linked parents. |
| Student | Sign in → dashboard and subject teachers → course attendance/material/assignments/quizzes/marks → AI tutor and personalized practice. Upload assignment files, update photo/profile, read announcements, submit complaints and leave requests. |
| Parent | Sign in using an account linked by student ID → child's courses and attendance → announcements → chat with the child's teachers. |

Primary covers classes 1–8, secondary 9–10, higher 11–12. Upper-school streams include Pre-Engineering, Computer Science, Medical and Humanities. Student IDs use hyphens. Teachers can have multiple assigned sections. Administration includes search, filters, account disabling/removal and password reset. Profile pictures are optional.

## Technology and libraries

| Layer | Main libraries and purpose |
|---|---|
| Frontend | Next.js 14 / React 18, TypeScript, Tailwind CSS, Radix UI dialogs/menus, React DayPicker, Lucide icons, next-themes, Axios |
| UI utilities | date-fns, clsx, tailwind-merge, class-variance-authority; React Hook Form/Zod and TanStack packages are installed for form/table/query support |
| API | Express, Mongoose, Zod, JWT, bcryptjs, Helmet, express-rate-limit, CORS, compression |
| Files | Multer, Sharp (small WebP portraits), pdf-parse (text extraction), CSV parsers |
| Realtime | Socket.IO server and client, authenticated teacher/parent conversations |
| AI | Groq chat completions, Hugging Face Transformers.js CPU embeddings, MongoDB Atlas Vector Search |
| Development | TypeScript compiler, ts-node, nodemon, Node test runner |

See each application's package.json and lockfile for exact versions. The entire backend runs as a persistent service; Socket.IO and quiz workers should not be deployed as Vercel serverless functions.

## AI features and how they work

### 1. Course tutor with RAG

RAG means retrieval augmented generation: retrieve relevant school content before asking the model to answer.

1. A teacher uploads notes, selectable-text PDFs or TXT files into a course.
2. Preparation extracts text, retains file/page metadata, and splits it into passages of up to 450 characters with a 350-character stride (overlap).
3. The local quantized `Xenova/paraphrase-multilingual-MiniLM-L12-v2` model creates normalized 384-number embeddings on the server CPU. Model files are downloaded and cached on first use.
4. MongoDB stores each passage, embedding, course ID and preparation revision. Atlas Vector Search indexes these vectors.
5. A student's question is embedded locally. Retrieval filters by the authorized course and model, then checks current materials/revisions and similarity.
6. Relevant passages and the question go to Groq (`GROQ_CHAT_MODEL`). The model must answer from the passages and cite supplied sources.
7. The server validates citation IDs and quoted text; unsupported answers fall back to an insufficient-evidence message. Students can inspect cited passages and source pages.

Embeddings stay in MongoDB; questions and selected text are sent to Groq. No model fine-tuning occurs. Scanned PDFs/images need a text transcript; OCR is not implemented. See [AI setup and Atlas index definition](server/AI_SETUP.md).

### 2. Personalized practice and flashcards

Students select 1–3 lessons, difficulty, 1–15 questions/cards and a quiz timer. The service samples up to 36 passages from selected materials. Groq generates batches of up to five items using short source IDs. The server attaches original passages, rejects invalid options/duplicates/unknown sources, and retries missing items. MCQs score against stored keys; written answers receive AI partial-credit feedback. Timed attempts save drafts, expire on the server, and retain results/history and progress. Flashcards track mastery. Practice scores do not change course grades.

### 3. Natural-language administration search

Descriptions such as courses taught by a teacher, students below an attendance threshold, or parents of a student are translated into constrained filters. The API validates and executes permitted queries; the model does not run arbitrary database commands. See [search details](server/ADMIN_SMART_SEARCH.md).

### 4. Teacher quiz checking and approval

Submission or deadline expiry queues an attempt. MCQs use exact answer keys. Written answers are checked by Groq against the teacher's private reference answers and optional marking criteria. The teacher sees proposed marks, deductions and feedback, can save private edits, and must choose **Approve & publish** before the grade reaches students. Errors remain retryable; version checks protect concurrent reviews. See [grading workflow](server/AI_ASSIGNED_QUIZZES.md).

## Other features

- Role-specific login and logout, access/refresh tokens, account activity checks.
- Course attendance starts from the admin's assigned course start date.
- Course content and assignment attachments; timed MCQ and written quizzes.
- Audience-specific announcements, unread badges, attachments, editing/deletion and 48-hour expiry.
- Student complaints with four-digit identifiers, evidence, admin remarks and resolved/unresolved status.
- Linked parent accounts and teacher/parent chat with class/section context.
- Optional student/teacher portraits (student photo selection saves immediately and updates the navbar), self-service profile editing, light/dark theme and partial Urdu/RTL support.
- Modal calendar/time pickers with Apply/Cancel, date bounds and keyboard support.

## Repository layout

This **apps directory is the upload-ready repository root**:

```text
README.md                 Project guide
DEPLOYMENT.md             Vercel / Render instructions
render.yaml               Backend Blueprint
.gitignore                Excludes secrets, local data and generated files
server/                   Express API, models, services, tests, AI guides
web/                      Next.js application and vercel.json
docs/screenshots/         Browser captures and capture notes
```

## Run locally

Use Node.js 22 and MongoDB (Atlas is needed for vector search). Open two terminals in this repository:

```powershell
cd server
Copy-Item .env.example .env
npm ci --workspaces=false
# Edit .env: MongoDB URI, separate random JWT secrets, optional Groq key.
npm run bootstrap:admin
npm run dev
```

Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in your private environment before bootstrap. No public default admin password is supplied. Bootstrap refuses to overwrite an existing administrator without its explicit reset flag. Do not run development seed scripts against a real school database.

```powershell
cd web
Copy-Item .env.local.example .env.local
npm ci --workspaces=false
npm run dev
```

Visit http://localhost:3000. API health: http://localhost:5000/api/health. Configure an academic year and accounts through admin. For AI run `npm run ai:index` then `npm run ai:prepare` inside server and wait for the Atlas index to become queryable.

## Environment and GitHub

Real .env files, password.txt, caches, uploaded files, node_modules and build output are ignored. Example files contain placeholders only. Put real secrets in your local environment and hosting dashboards, never in NEXT_PUBLIC variables. Only NEXT_PUBLIC_API_URL belongs in the browser.

```powershell
git add .
git diff --cached --stat
git commit -m "Prepare EduCore LMS for deployment"
# Create an empty GitHub repository, add its remote, then push your branch.
```

Ignoring files does not remove secrets from older commits or already-tracked files. This folder is prepared as a fresh repository; if you use another existing repository, check its tracked files before pushing. Rotate any key that has previously been published.

## Deployment

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for environment values, build/start commands, Atlas networking, admin setup, persistent files, cookies, sockets and verification. No hosting deployment has been performed by this preparation.

## Screenshots

All 59 browser captures are embedded in this README: six in the [product preview](#product-preview) and the remaining feature screens below. Each image includes its filename. See also the [standalone gallery](docs/screenshots/README.md).

Screenshots use synthetic data or built-in demo screens. They contain no real student records or credentials. AI responses and scores illustrate the interface; they are not live AI evaluations.

### Login screens

**Login admin** — [login-admin.png](docs/screenshots/login-admin.png)

![login admin](docs/screenshots/login-admin.png)

**Login parent** — [login-parent.png](docs/screenshots/login-parent.png)

![login parent](docs/screenshots/login-parent.png)

**Login student** — [login-student.png](docs/screenshots/login-student.png)

![login student](docs/screenshots/login-student.png)

**Login teacher** — [login-teacher.png](docs/screenshots/login-teacher.png)

![login teacher](docs/screenshots/login-teacher.png)

### Administrator portal

**Admin Academic year** — [admin-Academic-year.png](docs/screenshots/admin-Academic-year.png)

![admin Academic year](docs/screenshots/admin-Academic-year.png)

**Admin Announcements** — [admin-Announcements.png](docs/screenshots/admin-Announcements.png)

![admin Announcements](docs/screenshots/admin-Announcements.png)

**Admin Complaints** — [admin-Complaints.png](docs/screenshots/admin-Complaints.png)

![admin Complaints](docs/screenshots/admin-Complaints.png)

**Admin Courses** — [admin-Courses.png](docs/screenshots/admin-Courses.png)

![admin Courses](docs/screenshots/admin-Courses.png)

**Admin Parent accounts** — [admin-Parent-accounts.png](docs/screenshots/admin-Parent-accounts.png)

![admin Parent accounts](docs/screenshots/admin-Parent-accounts.png)

**Admin Student accounts** — [admin-Student-accounts.png](docs/screenshots/admin-Student-accounts.png)

![admin Student accounts](docs/screenshots/admin-Student-accounts.png)

**Admin Teacher accounts** — [admin-Teacher-accounts.png](docs/screenshots/admin-Teacher-accounts.png)

![admin Teacher accounts](docs/screenshots/admin-Teacher-accounts.png)

### Student portal

**Student Announcements** — [student-Announcements.png](docs/screenshots/student-Announcements.png)

![student Announcements](docs/screenshots/student-Announcements.png)

**Student Assignments** — [student-Assignments.png](docs/screenshots/student-Assignments.png)

![student Assignments](docs/screenshots/student-Assignments.png)

**Student Attendance** — [student-Attendance.png](docs/screenshots/student-Attendance.png)

![student Attendance](docs/screenshots/student-Attendance.png)

**Student Complaints** — [student-Complaints.png](docs/screenshots/student-Complaints.png)

![student Complaints](docs/screenshots/student-Complaints.png)

**Student course AI tutor** — [student-course-AI-tutor.png](docs/screenshots/student-course-AI-tutor.png)

![student course AI tutor](docs/screenshots/student-course-AI-tutor.png)

**Student course Assignments** — [student-course-Assignments.png](docs/screenshots/student-course-Assignments.png)

![student course Assignments](docs/screenshots/student-course-Assignments.png)

**Student course Course material** — [student-course-Course-material.png](docs/screenshots/student-course-Course-material.png)

![student course Course material](docs/screenshots/student-course-Course-material.png)

**Student course list** — [student-course-list.png](docs/screenshots/student-course-list.png)

![student course list](docs/screenshots/student-course-list.png)

**Student course My attendance** — [student-course-My-attendance.png](docs/screenshots/student-course-My-attendance.png)

![student course My attendance](docs/screenshots/student-course-My-attendance.png)

**Student course My marks** — [student-course-My-marks.png](docs/screenshots/student-course-My-marks.png)

![student course My marks](docs/screenshots/student-course-My-marks.png)

**Student course Personalized quiz** — [student-course-Personalized-quiz.png](docs/screenshots/student-course-Personalized-quiz.png)

![student course Personalized quiz](docs/screenshots/student-course-Personalized-quiz.png)

**Student course Quiz** — [student-course-Quiz.png](docs/screenshots/student-course-Quiz.png)

![student course Quiz](docs/screenshots/student-course-Quiz.png)

**Student My courses** — [student-My-courses.png](docs/screenshots/student-My-courses.png)

![student My courses](docs/screenshots/student-My-courses.png)

**Student photo navbar** — [student-photo-navbar.png](docs/screenshots/student-photo-navbar.png)

![student photo navbar](docs/screenshots/student-photo-navbar.png)

**Student Profile & settings** — [student-Profile-&-settings.png](docs/screenshots/student-Profile-%26-settings.png)

![student Profile & settings](docs/screenshots/student-Profile-%26-settings.png)

**Student profile photo** — [student-profile-photo.png](docs/screenshots/student-profile-photo.png)

![student profile photo](docs/screenshots/student-profile-photo.png)

### Teacher portal

**Teacher AI tutor** — [teacher-AI-tutor.png](docs/screenshots/teacher-AI-tutor.png)

![teacher AI tutor](docs/screenshots/teacher-AI-tutor.png)

**Teacher Assign assignment** — [teacher-Assign-assignment.png](docs/screenshots/teacher-Assign-assignment.png)

![teacher Assign assignment](docs/screenshots/teacher-Assign-assignment.png)

**Teacher chat** — [teacher-chat.png](docs/screenshots/teacher-chat.png)

![teacher chat](docs/screenshots/teacher-chat.png)

**Teacher Course material** — [teacher-Course-material.png](docs/screenshots/teacher-Course-material.png)

![teacher Course material](docs/screenshots/teacher-Course-material.png)

**Teacher courses** — [teacher-courses.png](docs/screenshots/teacher-courses.png)

![teacher courses](docs/screenshots/teacher-courses.png)

**Teacher Grades** — [teacher-Grades.png](docs/screenshots/teacher-Grades.png)

![teacher Grades](docs/screenshots/teacher-Grades.png)

**Teacher profile** — [teacher-profile.png](docs/screenshots/teacher-profile.png)

![teacher profile](docs/screenshots/teacher-profile.png)

**Teacher Sessions attended** — [teacher-Sessions-attended.png](docs/screenshots/teacher-Sessions-attended.png)

![teacher Sessions attended](docs/screenshots/teacher-Sessions-attended.png)

**Teacher Students** — [teacher-Students.png](docs/screenshots/teacher-Students.png)

![teacher Students](docs/screenshots/teacher-Students.png)

**Teacher Take quiz** — [teacher-Take-quiz.png](docs/screenshots/teacher-Take-quiz.png)

![teacher Take quiz](docs/screenshots/teacher-Take-quiz.png)

### Parent portal

**Parent announcements** — [parent-announcements.png](docs/screenshots/parent-announcements.png)

![parent announcements](docs/screenshots/parent-announcements.png)

**Parent chat** — [parent-chat.png](docs/screenshots/parent-chat.png)

![parent chat](docs/screenshots/parent-chat.png)

**Parent courses** — [parent-courses.png](docs/screenshots/parent-courses.png)

![parent courses](docs/screenshots/parent-courses.png)

### AI practice and grading

**AI quiz review and approval** — [ai-quiz-review-and-approval.png](docs/screenshots/ai-quiz-review-and-approval.png)

![AI quiz review and approval](docs/screenshots/ai-quiz-review-and-approval.png)

**Flashcard study** — [flashcard-study.png](docs/screenshots/flashcard-study.png)

![flashcard study](docs/screenshots/flashcard-study.png)

**Personalized quiz attempt** — [personalized-quiz-attempt.png](docs/screenshots/personalized-quiz-attempt.png)

![personalized quiz attempt](docs/screenshots/personalized-quiz-attempt.png)

**Personalized quiz ready** — [personalized-quiz-ready.png](docs/screenshots/personalized-quiz-ready.png)

![personalized quiz ready](docs/screenshots/personalized-quiz-ready.png)

**Personalized quiz result** — [personalized-quiz-result.png](docs/screenshots/personalized-quiz-result.png)

![personalized quiz result](docs/screenshots/personalized-quiz-result.png)

### Calendar and time dialogs

**Date picker dark** — [date-picker-dark.png](docs/screenshots/date-picker-dark.png)

![date picker dark](docs/screenshots/date-picker-dark.png)

**Date picker desktop** — [date-picker-desktop.png](docs/screenshots/date-picker-desktop.png)

![date picker desktop](docs/screenshots/date-picker-desktop.png)

**Date picker mobile** — [date-picker-mobile.png](docs/screenshots/date-picker-mobile.png)

![date picker mobile](docs/screenshots/date-picker-mobile.png)

### Design system and demonstration screens

**Demo design system** — [demo-design-system.png](docs/screenshots/demo-design-system.png)

![demo design system](docs/screenshots/demo-design-system.png)

**Demo fees** — [demo-fees.png](docs/screenshots/demo-fees.png)

![demo fees](docs/screenshots/demo-fees.png)

**Demo marks** — [demo-marks.png](docs/screenshots/demo-marks.png)

![demo marks](docs/screenshots/demo-marks.png)

**Demo reports** — [demo-reports.png](docs/screenshots/demo-reports.png)

![demo reports](docs/screenshots/demo-reports.png)

**Demo timetable** — [demo-timetable.png](docs/screenshots/demo-timetable.png)

![demo timetable](docs/screenshots/demo-timetable.png)

## Checks and limitations

```powershell
cd server
npm run build
npm test
cd ../web
npm run build
```

Automated tests cover key authorization, course access, grading, deadlines, profiles, announcements and related services. Browser checks cover calendar/time controls. Test success is not a full security audit. Existing short-password allowances were requested for local testing; choose strong production credentials. Multi-tenancy, complete Urdu translation and conversion of all older demo screens need further work. Background expiry requires the backend to be awake; CPU embeddings need sufficient memory and startup time. AI can make mistakes; teacher approval is mandatory for published quiz grades.
