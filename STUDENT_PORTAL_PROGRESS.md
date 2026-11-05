# Student portal implementation status

## Existing application audit

The web app is Next.js 14 and the API is Express/Mongoose. The existing shared dashboard, attendance, results, fees, timetable, and notices pages use mock data. The student role previously entered a demo view without validating credentials. Existing student, attendance, fee, result, and timetable read endpoints accepted IDs or filters without enforcing student ownership; these staff endpoints now reject student requests. Existing roles and staff screens are otherwise retained.

## Implemented foundation

- Student and administrator login use the existing authentication API and reject accounts with a mismatched role. Teacher and parent login screens remain demo previews.
- The administrator account-management screen at `/admin/users` can create student, teacher, parent, and admin accounts and deactivate or reactivate them. Deactivation preserves records, clears refresh tokens, and cannot target the current administrator. Creating a student also creates the student profile; class enrollment remains separate. Initial admin setup is documented in `README.md` and is not run automatically.
- Refresh tokens are stored as SHA-256 hashes and rotated atomically. Old plaintext refresh tokens can be rotated once into hashes; login removes old plaintext tokens from that account. No database migration is run automatically.
- `/student` loads the authenticated student's profile, dashboard, attendance, published results, fees, timetable, and notices from the API. Profile contact details and preferences are saved through validated endpoints. The student ID is resolved from the authenticated user, not supplied by the browser.
- Forgot and reset password forms call the existing API. Reset emails require SMTP configuration. Notifications, theme, reduced motion and language preferences are stored; Urdu translation is partial.
- Students can submit and track leave requests; open published courses in their enrolled sections; read published text lessons; save private notes, bookmarks and completion; and save or submit text assignments. Deadlines and resubmission rules are checked on the server. Course and assignment creation by staff is not implemented yet, so these screens are empty until suitable content is inserted by an authorized administrative process.
- Fee vouchers have an ownership-checked printable view and payment-history display. No online payment gateway is connected.
- Optional development student seed: after configuring a non-empty `SEED_STUDENT_PASSWORD` in `server/.env`, run `npm run seed:student` from `server`. It creates `ayesha.student@example.test` only if absent and does not change an existing account. Run the regular seed first if an academic year and Grade 8 are needed. The seed has not been run automatically.

## Student API

All `/api/student` endpoints require a valid student access token and resolve the active student record from the authenticated user. `page` defaults to 1 and `limit` defaults to 20, with a maximum of 50.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/student/profile` | — | Own profile, active enrollment and preferences |
| PATCH | `/api/student/profile` | `phone`, `address` | Updated contact fields |
| PUT | `/api/student/preferences` | `language`, `theme`, `emailNotifications`, `inAppNotifications`, `reducedMotion` | Saved preferences |
| GET | `/api/student/attendance` | `page`, `limit` | Own attendance dates and statuses |
| GET | `/api/student/results` | `page`, `limit` | Own published results |
| GET | `/api/student/vouchers` | `page`, `limit` | Own vouchers |
| GET | `/api/student/vouchers/:voucherId` | — | An owned voucher |
| GET | `/api/student/vouchers/:voucherId/payments` | `page`, `limit` | Payments for an owned voucher |
| GET | `/api/student/timetable` | — | Active enrolled sections' timetable |
| GET | `/api/student/notices` | `page`, `limit` | Active notices for the student audience and class |
| GET/POST | `/api/student/leave` | Pagination / `startDate`, `endDate`, `reason` | Own leave requests / submitted request |
| GET | `/api/student/courses` | `page`, `limit` | Published courses in active enrolled sections |
| GET | `/api/student/courses/:courseId` | `page`, `limit` | Course and published lessons |
| GET | `/api/student/lessons/:lessonId` | — | Enrolled lesson and own progress |
| PUT | `/api/student/lessons/:lessonId/progress` | `note`, `completed`, `bookmarked` | Own saved lesson progress |
| GET | `/api/student/assignments` | `page`, `limit` | Published enrolled assignments and own statuses |
| GET | `/api/student/assignments/:assignmentId` | — | Enrolled assignment and own submission |
| PUT | `/api/student/assignments/:assignmentId/submission` | `text`, `submit` | Own draft or submission |

Invalid inputs return 400, unauthenticated requests return 401, other roles return 403, and missing/inaccessible records return 404.

## Remaining work

The full plan is not complete. Session management, MFA, photo upload, complete Urdu translations, leave approval, an online payment gateway, learning modules and media, offline caching, assignment file uploads/rubrics/extensions, quizzes, communication and realtime notifications, AI tutor and adaptive features, extras, PWA/offline support, accessibility/security/load audits and monitoring still need to be built. The new learning records have an optional indexed `schoolId`, and their reads use the student's school where present; legacy records are kept in an unassigned scope. Existing LMS collections and their queries are not fully tenant-scoped, and a reviewed migration is still required before multi-tenant claims can be made. Seven unit/HTTP tests pass, but database-backed isolation and end-to-end tests have not yet been run.
