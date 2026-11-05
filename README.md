# EduCore — AI School LMS

A school learning and administration application for **administrators, teachers, students and parents**, built with MongoDB, Express, React (Next.js), Node.js and TypeScript.

> Development project: core portal workflows are implemented. Some older generic reports, timetable and finance screens still contain demonstration data. This is not a certified production school system or a completed multi-tenant SaaS.

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

See [the 59-image screenshot gallery](docs/screenshots/README.md) and [AI detail views](docs/screenshots/AI-DETAILS.md). Captures from public/design-system/demo pages are clearly marked; they are not proof of a live database or AI answer. No real credentials or student records are included.

## Checks and limitations

```powershell
cd server
npm run build
npm test
cd ../web
npm run build
```

Automated tests cover key authorization, course access, grading, deadlines, profiles, announcements and related services. Browser checks cover calendar/time controls. Test success is not a full security audit. Existing short-password allowances were requested for local testing; choose strong production credentials. Multi-tenancy, complete Urdu translation and conversion of all older demo screens need further work. Background expiry requires the backend to be awake; CPU embeddings need sufficient memory and startup time. AI can make mistakes; teacher approval is mandatory for published quiz grades.
