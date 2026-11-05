# Personalized quizzes and flashcards

Student → My courses → open course → Personalized quiz.

Select 1–3 published lessons by title or filename. Choose MCQ, short-answer or flashcard practice, easy/medium/hard, and 1–15 items. Timed quizzes accept 1–60 minutes. Generation uses the existing server-only GROQ_API_KEY and GROQ_CHAT_MODEL; no additional credentials or dependencies are needed.

New materials are prepared through the existing local embedding/PDF extraction pipeline automatically. Already prepared materials reuse their current TutorSource revision. The service samples up to 36 passages spread across the selected lessons, so a single generated quiz does not promise exhaustive coverage of a long document. Text notes, TXT and PDFs with selectable text work; image-only lessons need transcripts.

Generation uses batches of at most five questions and short excerpt IDs. The server attaches the original selected passage, so the model does not need to reproduce PDF punctuation or copy long database IDs. If the model supplies a quote, it must match the selected excerpt; only whitespace and typographic quotation differences are tolerated. Valid questions are retained while rejected or missing items are regenerated, with at most two extra calls. Unknown sources, duplicate prompts, invalid options, and written questions without answers are rejected. An incomplete quiz is never saved: after retries, the error reports how many valid items were prepared and suggests a smaller count or another lesson.

Generated practice is saved separately from teacher-assigned quizzes and grades in PersonalizedQuiz. Quiz questions become visible after Start; correct answers, explanations and evidence are hidden until completion. Flashcards reveal their answers for self-study and persist the set of mastered cards.

The server creates the deadline on the first start. Reloading or starting again preserves it. Drafts have monotonically increasing versions, preventing older saves from replacing newer answers. Submissions are atomic, immutable and idempotent. A late submission uses only the last draft stored before the deadline. The browser requests results automatically at expiry; a server worker checks expired attempts every 15 seconds, including after restarts and when the browser is closed. An offline browser receives the result after reconnecting.

MCQs are scored locally (1 point each, blanks 0). Short answers are graded by Groq against the stored reference answer and supporting quote, with 0/0.5/1 points and feedback. Blank answers always score zero. Provider failures preserve submitted answers and leave grading retryable; grading leases prevent simultaneous duplicate work. Scores are study aids and never update course marks.

History is paginated (10 per page). Statistics cover all of the student's practice quizzes in the current course: generated, attempted, completed, average and best percentage. Flashcard deck counts and mastery are displayed separately.

All API routes require an active student with course access. Attempts are queried by student ID and course ID together. Generation additionally validates that every selected lesson belongs to that course. Generation is limited to three requests per minute per student. Source snapshots preserve review explanations when the original material is later deleted.

Verification:

```powershell
# apps/server
npm run build
node --test -r ts-node/register tests/personalizedQuiz.test.ts tests/courseTutor.test.ts

# apps/web
npm run build
```

Restart the API to mount `/api/personalized-quizzes` and start the expiry worker. No manual database migration is required; Mongoose creates the collection and indexes.
