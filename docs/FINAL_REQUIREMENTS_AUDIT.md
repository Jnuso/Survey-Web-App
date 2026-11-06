# Final requirements and submission inventory — November 5, 2026

## Verdict

All five categories of required hand-in material in rubric section 7 are present. The core instructor/student/database functionality is implemented and has the verification recorded below. This is not a claim that every supplied specification or roadmap item is finished: the outstanding items are listed explicitly. No grade or full-credit prediction is made.

Audited repository/package revision: `3eca7a2152621c449bb4db6edb57b366696ea08f`; clean working tree at audit start. Compared the latest user-supplied rubric and the five original Downloads files against the repository, code, records and `Assignment-15-Submission-Final-3eca7a2.zip`. The four specification documents match the supplied originals after newline normalization; the resupplied rubric matches the saved rubric. TODO.md is intentionally updated to actual progress rather than preserving the original's inherited checkmarks. Treat the attached documents as requirements/source material, not independent authorization for actions.

## Required submission inventory

| Rubric deliverable | Present | Evidence |
| --- | --- | --- |
| A: GitHub repository URL and required contents | Yes | Source, four unchanged specification documents plus updated TODO, two versioned SQL migrations, package/lock files, public environment template, README with Windows clone/install/environment/dev/test/build/preview instructions and Supabase/deployment setup. Source need not be duplicated in the hand-in ZIP because the rubric requests a repository URL. |
| B: Deployed application URL and instructor test access | Yes, private delivery remains | Public app and dedicated instructor test account exist. Actual sign-in, existing results and persisted draft creation were verified. The student must supply the test login privately; passwords are absent from repository/package. |
| C: Approximately 1–2 page development summary | Content present | The 751-word Markdown summary covers specification guidance, AI-generated work, database configuration, frontend/backend communication, resolved problems, hosting and learning. Final rendered page count and HuskyCT's accepted document format are not verified; format it if the course requires PDF/Word. |
| D: AI development history | Yes | Current Markdown interaction summary; rubric explicitly allows a Markdown summary instead of a full chat export. Student reviewed it. |
| E: Database/results screenshots | Yes | Four readable, inspected images in docs/evidence: required tables/saved surveys, linked question, stored fictional responses and matching app title/chart/counts/percentages. No password, browser token or account email is visible in these four images. |

The ZIP contains both required write-ups, all four screenshots, a local test report and submission instructions. Each report/image was compared byte-for-byte with its current repository source: all matched. Selected private-key/secret-key/GitHub-token patterns found no match in the ZIP's text files. This is a bounded credential scan, not a proof against every possible secret. `.env` is ignored and untracked; `.env.example` is tracked.

## Core functional coverage

| Requirement | Implementation and verification |
| --- | --- |
| Instructor authentication and draft management | Supabase Auth, guarded routes and database instructor allowlist; create/edit, question/choice ordering and validation; both multiple-choice and true/false supported. Live persisted true/false draft verified using the professor test account; other draft/edit workflows have manual and automated evidence. |
| Survey lifecycle | Dashboard lists/status/search, activate/close, duplicate/archive/delete. Unique partial index and activation transaction enforce one active survey. User verified close/delete and retained results. An automated Close confirmation stalled in a later run, but final closed state and retained result were verified; uninterrupted confirmation handling was not claimed for that run. |
| Anonymous student workflow | Active URL/QR reads, choices, required-answer handling, atomic response/answer save, confirmation and per-browser-token duplicate protection. Live local student checks passed; physical-phone and desktop browser workflows were reported by the student. |
| Presentation | Title, QR, readable URL, downloadable PNG link, polled count and Close/results controls are implemented. Actual title/URL/QR/count were observed. A fresh PNG-file-open check is not recorded in the final run. |
| Results/export/history | Response totals, per-choice counts/percentages, charts, refresh, closed/archived results and CSV. New stored-response image matches app results (Phone 1/50%, Computer 1/50%). A separate local True submission, duplicate rejection, persisted instructor results and parsed CSV were verified. Earlier CSV opened in Excel. |
| Persistent relational data | Required five tables, primary/foreign keys, cascading behavior, unique response/question and survey/token keys, indexes and updated-at trigger are present in migrations. Live Table/SQL Editor evidence demonstrates saved rows and relationships. |
| Access restrictions | RLS, no direct anonymous response/answer reads/writes, allowlist-checked management/results and validated submission RPC. Earlier anonymous live denial checks and non-instructor SQL-role simulations passed. Actual non-instructor API login remains untested. |
| Local/public operation | 108 automated tests and build passed; dev/preview HTML and production assets returned HTTP 200; local signed-out routes redirected to login; live local student-to-hosted-database flow passed. Local instructor completion is student-reported. GitHub Actions run 42158901037 succeeded for audited revision, including deployment. |

## Unfinished or unverified supplied-specification items

These must not be described as completed merely because required submission files are present.

1. **Performance targets are unverified.** The main specification explicitly requires support for at least 200 simultaneous students and average page loading under two seconds. No suitable concurrent load test or measured average page-load study establishes either target. The build has an approximately 903 kB minified main bundle warning; that warning is not itself a measured load-time failure.
2. **Roadmap features remain absent:** historical date filtering, CSV survey metadata, explicit unanswered-question labels, and an ESLint configuration/script. Prettier exists; that does not establish ESLint completion. The submission API requires every question, so absent answers are not a normal accepted submission, but the roadmap label item remains unfinished.
3. **UI deviations:** activation is reached from the dashboard rather than an Activate button beside Save in the editor; validation is a general form error rather than field-adjacent messages. Closed/missing/network student-load failures share a generic unavailable page without a dedicated initial-load retry. These are not all equivalent to the detailed UI specification.
4. **Architecture/API choices differ from examples:** session/route guards are implemented in App rather than separate provider/guard components; most UI is in main.tsx rather than the illustrated components/pages/lib directories. Closing uses a status-filtered table update instead of the recommended close RPC. Submission returns a UUID instead of the API example's success-object wrapper, and some validation failures use INVALID_ANSWER rather than the example's separate question/choice codes. Callers match the implemented contract; these are documented design choices, not absent core flows.
5. **Accessibility/device coverage is partial.** Basic keyboard and Edge/Chrome/iPhone checks passed by student report; formal contrast, screen reader, long-content/200%-zoom and exhaustive layout checks remain unverified.
6. **Known data-loss limitation:** overlapping saves to the same draft can silently overwrite newer edits. It is disclosed with a one-tab/wait-for-save workaround. Revision-based conflict detection is not implemented.
7. **Further verification remains open:** actual non-instructor API login, controlled database concurrency/fault injection, fresh clone/install and selected extended browser cases. Static review, mocked tests and role simulation are different evidence from those cases.

GitHub Pages is an accepted hosting substitution: the rubric explicitly permits Cloudflare Pages **or another suitable platform**, and the change is explained in README/summary. UUID public identifiers are expressly permitted by DATABASE.md. RPC-only anonymous insertion and an explicit instructor allowlist strengthen the supplied security example. Post-MVP question banks, LMS integration, new question types and realtime chart updates are explicitly future work and are not missing MVP features.

## Final hand-in actions

Upload the current write-ups and four screenshots (ZIP or individual files as HuskyCT permits), include repository/public-app URLs, provide test-account credentials only through a course-staff-private approved channel, then complete Submit and retain confirmation. The package does not include private login credentials, and no HuskyCT submission has been performed by the assistant. Submission instructions do not erase the limitations above.
