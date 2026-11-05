# Admin natural-language search

Courses and all four account directories now default to a “Search in your own words” box. Example prompts populate the box; press Search to apply. Manual search, filters and sorting remain under a collapsed disclosure.

Examples:

- Courses: “Show all courses taught by Ahmed”; “Show class 11 CS section A courses”.
- Student accounts: “Show students with attendance below 70 percent”; “Show female students in class 8 section B”.
- Parent accounts: “Show parents of student Ali”; “Show parent of student high-cs-11-0001-A”.
- Teacher accounts: “Show disabled teachers teaching Physics”.
- Admin accounts: “Show active admins named Ahmed”.

Groq interprets the sentence once through `POST /api/admin/search/interpret`. It receives the entered sentence, target list, date, and allowed field definitions. No database rows, passwords, API keys or stored account details are included in the model prompt. Names entered by the admin are part of that sentence.

The result is a strict, role-specific filter plan. The API constructs MongoDB queries itself; model-supplied queries, operators and code are never executed. Every interpretation request requires administrator authentication and is rate-limited to 10 per minute per admin. Submitted plans are validated again when listing accounts/courses, including on subsequent pages. Non-admin course requests cannot use smart filters.

Filters are combined with AND. Names/emails are escaped literal case-insensitive partial matches, so multiple people with matching names can appear. A generated student ID or admission number is an exact match; old comma-separated student IDs are normalized to hyphens. Parent matching uses Student.guardianIds, not text from the parent contact fields. Unknown children produce an empty parent list. Removed accounts are excluded.

Academic filters use the current year. Class and section membership is resolved through enrollment for students and their parents, and through teacher assignments for teacher accounts. “Section A” without a class intentionally means section A across matching current-year classes/streams. Searches show an Applied summary so administrators can check these interpretations.

Attendance means recorded subject sessions in the current year, after both the course start date and the student's current enrollment date, in the enrolled section. The percentage is `(present + late) / total recorded subject sessions * 100`. Absent and leave count in the denominator; no-record students and unmarked sessions are excluded. Comparison uses the unrounded percentage; the displayed evidence is rounded to two decimal places. Below is strict `<`; “at most” is `<=`. Optional date ranges filter the recorded sessions. Daily class-register attendance is not combined with subject sessions.

Student search results include the computed percentage and attended/total counts. Parent rows show linked student names and IDs. Account filtering happens before pagination; counts and subsequent pages use the same filters. Applying a new smart search resets manual filters and pagination. Manual filters can then further narrow the results. Clear removes the search.

Missing thresholds/names, ambiguous requests, unsupported fields, OR/NOT searches and historical academic-year requests ask for clarification rather than deliberately defaulting to all records. AI/network errors leave the previous search in place. The Applied summary remains available to check the model's interpretation.

Uses the existing server-only `GROQ_API_KEY` and `GROQ_CHAT_MODEL`. No new provider, database migration or dependency is required. Restart the API to mount the new interpretation route.

Validation: server build, web build, `tests/adminSearch.test.ts`, `tests/accountFilters.test.ts`, `tests/adminUsers.test.ts`, `tests/courses.test.ts`; live Groq interpretation checks and read-only Atlas checks for course, attendance and parent-link filtering.
