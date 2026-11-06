# Learning and development log

## Phase 1 — Architecture and setup

The assignment separates the interface from data storage. React builds pages from components; TypeScript checks types; Vite runs and builds the app. Git tracks source history, and GitHub hosts the repository. Supabase provides PostgreSQL (relational tables and constraints), authentication, and a browser-facing API. GitHub Pages now hosts the built frontend; Cloudflare Pages was the original plan.

The inherited TODO checkmarks were reset because this repository started empty. The five supplied specifications remain in the project. Exercise: open `DATABASE.md` and trace how a survey connects to questions, responses, and answers.

## Phases 2–5 — Implementation underway

At this phase, the app routes and database migration had been authored but had not yet been verified against Supabase. A browser sends a submission to a database function; the function checks that the survey is active and that choices belong to its questions, then inserts the response and answers in one transaction. Instructor accounts are explicitly enrolled in `public.instructors`.

Review: an independent agent identified possible result truncation and overbroad instructor access. The code was adjusted to load response pages and require an instructor allowlist. These adjustments still need integration tests. Exercise: trace `submit_survey_response` from the student page to the SQL function, then identify where it rejects a duplicate.

## Reviewer experiment

A blind direct-agent review received only four synthetic cases, not the answer key. It identified all three seeded defects and correctly reported no finding for the control. This is a tiny illustrative result, not an accuracy estimate; no tests were run by that reviewer. The existing custom worker's Docker-based execution was unavailable, so no comparable Gemma baseline has run. See `reviewer-experiment/` for the cases, key, and protocol.

## Remaining evidence

Record real Supabase setup, tests, deployment, and issues resolved as they occur. Screenshots and final submission statements must reflect actual results; no credentials or private student data should be included.

## Verification recorded October 30, 2026

`npm run build` passed, with a bundle-size warning; the landing page and sign-in page were checked in a local browser using placeholder public configuration. `npm test` passed two CSV tests. `npm audit` reported zero vulnerabilities after updating the test runner. At that point, database behavior, authentication, real results, mobile use, and deployment remained unverified.

## Supabase connection — October 30, 2026

Created a dedicated Supabase project and applied the initial schema. Supabase Table Editor shows surveys, questions, choices, responses, answers, and instructors. The app's ignored local `.env` now contains the project URL and publishable key; no service-role key was used.

A public-client check found that survey, question, and choice queries succeeded with zero rows; queries for responses and answers failed with permission code 42501, as did an attempted anonymous survey insert. This confirms only the tested empty-database access cases. Active survey reads, instructor access, submissions, and persistence remain to be checked with test data.

A rollback-only SQL integration check then created a disposable draft through `save_survey`, activated it, submitted an answer, confirmed its answer row, and checked that a duplicate browser token was rejected. The transaction was rolled back. The instructor account was enrolled in the allowlist. These checks do not replace a browser-based workflow, tests of active survey public reads, or live deployment tests.

## End-to-end local sample

Signed in with the enrolled instructor account, created and activated `Sample: Classroom Check-In`, opened its presentation page, submitted a sample answer through the student page, and saw one response and 100% for the selected choice in the results. A separate anonymous Supabase client read the active survey, submitted another sample answer, was refused on a second submission with the same token, and could not read responses. The sample survey and two sample responses remain in the project, clearly labeled for testing; no real student data was used. At this local-test stage the QR code pointed to localhost.

## GitHub Pages deployment

The project switched from the planned Cloudflare host to GitHub Pages. GitHub Actions run 41128733109 succeeded after tests and production build, and the public site returned HTTP 200 at https://jnuso.github.io/Survey-Web-App/. In a browser, an anonymous visitor opened the sample survey by its production hash URL, submitted a response successfully, and received the duplicate-submission message on a second attempt. At deployment time, instructor sign-in, results, QR scanning on a phone, and the full production workflow still required verification.

## Production instructor check

An instructor signed in to GitHub Pages. The sample results showed three responses: two for Confident (66.7%) and one for I have questions (33.3%). The presentation page showed three responses and the public GitHub Pages student URL. A physical phone scan is still pending.


## Phone QR check

The student scanned the presentation QR code on a phone and reported that the deployed survey opened. A phone submission was not confirmed.

## Results snapshot

The results page now calls an instructor-only database function that returns the survey definition and all responses from one statement snapshot. The display and CSV use that same returned data. A rollback-only SQL test checked 601 distinct response IDs and their answers; an anonymous RPC call was denied with code 42501. An independent agent reviewed the SQL and frontend mapping without finding a concrete defect. The build and existing CSV unit tests passed. A concurrent-submission stress test and production browser verification are still needed; a very large survey could exceed the cost or memory limits of a single JSON response.


## Local edge-case checks — October 31, 2026

The internal browser could not be opened because local browser use was disabled in Work settings, so no new browser cases were marked passed. CSV unit coverage was extended for zero and missing answers, Unicode, line breaks, formula-like values, and a 601-row export. These checks do not replace opening an export in a spreadsheet or testing live concurrent submissions. The TODO implementation checkboxes were reconciled with the code; checked implementation is distinct from end-to-end verification.


## Browser and database checks — November 1, 2026

The internal browser became available. A fictional two-question test draft was created, reloaded, edited, reordered, duplicated and activated; the previous sample closed automatically. Blank title and unanswered submission were rejected. One completed response was saved; repeating it with the same token was rejected. Results refreshed to show the chosen answers at 100%. The student tab shared the instructor browser session, so this run does not independently verify signed-out access. Supabase showed both test questions and the saved response. Screenshots in `docs/` record the test data and omit browser tokens. The CSV button was clicked, but the downloaded file was not located or inspected. The explicit close confirmation was interrupted, so closing by that button remains unverified. The original test survey remains active; the earlier sample is closed and retains its results.


The previously interrupted close action subsequently took effect: the test survey was closed, its results remained available, and its student link showed unavailable. Its duplicate was activated. The exported CSV contained the expected response ID, timestamp, and both test answers when parsed with PowerShell. After sign-out, dashboard and results routes redirected to login; a fictional response to the active duplicate succeeded without signing in. The instructor is now signed out in the internal browser. A spreadsheet application check remains outstanding.


The student reported that the active test survey opened on a physical phone and that submitting fictional answers produced the thank-you confirmation. The instructor-side count for this specific response has not yet been checked.


## Background verification — November 4, 2026

The deployed active student page opened in the background. Supabase showed two stored responses for that survey, but their identity as the phone response was not independently established. Anonymous API attempts to read `responses` and `answers` and call `get_survey_results` were denied (HTTP 401, PostgreSQL code 42501). Five unit tests and the production build passed; Vite reported its existing bundle-size warning. `npm audit --omit=dev` found zero production dependency vulnerabilities. The Android emulator was not run because background interaction without interrupting the user had not been verified.


## Student form tests and recovery

Added React component tests with a mocked backend for active-survey query filters, validation, successful and duplicate submissions, storage failure, retry, in-flight double clicks, route changes, late requests, and rejected promises. They found that a rejected request could leave the page loading or its submit button disabled; the student flow now reports an error and re-enables retry. An independent direct reviewer checked the changes and identified test timing and Node compatibility issues, which were corrected. Twenty automated tests and the production build passed. These component tests do not verify live database policies, network reliability, or Android behavior.


## Results tests and race recovery

Added mocked component tests for empty results, counts, percentages, retry after an initial error, recovery after a failed refresh, route changes with delayed responses, and passing the displayed snapshot to CSV export. A regression test reproduced a race where a late request for survey A could overwrite survey B; the results page now ignores superseded requests and clears previous survey data on route changes. Initial load failures now offer a Try again button. An independent direct reviewer examined the fix and tests. These tests do not establish database concurrency correctness or inspect real downloaded CSV contents.


## Editor component tests and remaining save risk

Mocked component tests cover saving, question-type confirmation, rejected saves, draft loading, and navigation during pending work. They reproduced and prompted fixes for late draft loads and saves affecting a different editor, editable controls during saving, and the blank editor shown after a failed draft load. The form is now disabled during saving and a load failure offers a retry rather than an editable blank draft. Independent review noted an unresolved case: leaving and reopening the same draft before its pending save finishes can allow another save, and a failure after leaving may not be reported to the instructor. Concurrent save ordering and navigation during saving need a stronger solution; avoid leaving a draft while saving. Component tests use mocked services and do not prove database transaction ordering.


## Authentication and independent student client

Mocked component tests cover signed-out redirects, invalid credentials, rejected sign-in requests, session errors and retry, authentication-event ordering, and public student routes. Rejected authentication operations previously left the interface loading or disabled; it now reports a safe error and allows retry. Independent review found that Supabase data requests also consult the client auth session, so simply bypassing the instructor error screen was insufficient. Student reads and submissions now use a distinct non-persisted anonymous client. Tests using the installed SDK and stubbed HTTP show that this client neither consults the instructor session nor forwards a synthetic instructor token. Stubbed tests do not prove production behavior or replace live access-policy checks.


## Presentation tests and close safeguards

Added mocked component tests for QR presentation, count loading, polling recovery, slow requests, close cancellation, duplicate clicks, zero-row updates, route changes, and independent polling and close errors. Review found that an update affecting zero rows could previously appear successful, a late close could redirect from another survey, and polling could erase close errors. The close now targets the active survey, requires a returned row, guards route changes, and keeps close errors separate. An unknown count no longer displays as zero. Fifty-nine automated tests and the production build passed. These tests mock Supabase and QR generation; the changed close update needs a live instructor-session check. The unresolved overlapping editor-save risk remains.


## Dashboard component tests and mutation safeguards

Mocked tests cover filtering, activation, cancellation, failed list loading and retry, close and delete outcomes, and leaving during activation or duplication. A failed list request previously left the dashboard loading; the dashboard now reports an error and offers retry. Close, archive, and delete now filter by the status displayed and require a returned row, and pending actions no longer redirect after leaving the dashboard. An independent review confirmed these paths and noted that status checks do not detect concurrent same-status edits; compare-and-swap revision handling is still needed for cross-tab protection. The changed update/delete query chains remain unverified against live Supabase. All 71 automated tests and the build passed locally.


## Student client request checks

Using the installed Supabase SDK with a stubbed HTTP transport, added checks for the anonymous submission request body, duplicate error code and message, network failure and retry path, and absence of an instructor token on the request. The transport is simulated: this verifies client wiring but does not test live Supabase or database concurrency. An independent reviewer identified missing assertions, which were added.


## Keyboard and editor labels

Added a simulated keyboard submission test and named editor question regions and controls so repeated choices can be distinguished. A reorder test checks that the labels follow the correct question. In a hidden browser, Tab and arrow keys reached and selected choices and then focused Submit; no submission was made in that browser check. This is not a screen-reader or full keyboard accessibility audit. The full suite passed 76 tests with two workers, and the production build passed with its existing bundle-size warning. An earlier parallel run timed out one test under load.


## Additional validation and export tests

Added tests for multi-question CSV escaping and answer mapping, per-question results percentages, duplication payloads, and editor validation and recovery. The editor now reports whitespace-only survey titles before sending a save request. The full suite passed 82 tests with two workers on November 4; the production build passed after the title change with its existing bundle-size warning. Component tests use a mocked backend and do not replace outstanding live instructor and database checks.


## Expanded workflow checks

Added mocked tests for student storage and lost-response retries, presentation route changes, failed result refresh and export, dashboard activation and archive, and editor restrictions, ordering, and cancelled deletion. The full suite passed 94 tests with two workers on November 4. Live instructor, database, device, and accessibility checks remain as listed in the submission checklist.


## Live lifecycle check — November 5

A disposable draft was created and archived, then duplicated. The duplicate retained its question and choices, activated successfully, displayed a QR and student URL, accepted a fictional Yes response, and instructor results showed one response and Yes 100%. Activating it closed the prior active sample; its responses were retained. The presentation close confirmation stalled in the browser, and a fresh dashboard still showed the disposable survey active; close is not verified. Deletion, spreadsheet inspection, and remaining access-control checks remain open.


On November 5, a full run with two workers had three timeouts and one subsequent failure; a repeat using one worker and a 20-second per-test timeout passed all 104 tests. The constrained run took approximately 257 seconds, so the earlier failures should not be represented as a clean first pass.


On November 5, the previously downloaded fictional-response CSV was opened in Excel. The fields appeared in separate columns and the answers displayed as TRUE and Testing. Long headers and the response ID were clipped by the default column widths; the full values were verified in the CSV text. GitHub Actions run 42001432449 for commit 02db831 completed successfully.


## Database role checks — November 5

In the Supabase SQL editor, a rollback-only transaction simulated the authenticated role with a non-instructor UUID. `is_instructor()` returned false, and response and answer counts visible under row-level security were both zero. A separate simulated-role call to `get_survey_results` for the disposable survey raised `AUTH_REQUIRED`. These checks did not authenticate an actual non-instructor account through the API, so that integration case remains open. A read-only instructor query also found one response for the disposable survey and two for the earlier active test survey.

A further rollback-only SQL check attempted a no-op update of the active disposable survey under the simulated authenticated non-instructor role. The update returned zero rows. This does not establish behavior for every write operation or a separately signed-in account.

## Additional rubric/code audit — November 5

Compared the resupplied rubric with the source and deliverables, inspected existing screenshots, and used two independent direct reviewers on commit `087baec`. A delayed mocked submission reproduced changing a visible answer after an earlier answer was sent; a count-only mocked poll failure reproduced the presentation hiding its valid QR and controls. These two defect demonstrations passed separately from the normal 104-test suite, which passed in 44.66 seconds with one worker and a 20-second timeout. The build passed with the existing bundle warning; dependency scans reported zero known advisories. A bounded scan of 172 Git text-blob versions found no selected private-key/token patterns, service-role JWTs or tracked `.env`.

The updated Gemma MCP worker could not create a job: the original repository path was outside its allowlist, and a permitted source-only snapshot then reached a Docker startup failure involving a stale local socket. A reversible socket rename failed; no reset or global configuration change was made. Gemma produced no findings. Direct static review identified no student/non-allowlisted privilege bypass, but this audit did not inspect live effective permissions or run database concurrency checks. Application code was unchanged. The additional audit and submission checklist record the new fixes and outstanding live tests/evidence.

## Student manual close/delete verification — November 5

The student followed the final manual checklist and supplied before/after screenshots. `Survey Test` is shown closed, its student URL shows the unavailable message, and results show 2 responses with one Phone and one Computer answer at 50% each. A disposable duplicate named `TEST — DELETE ME` appears in the earlier dashboard screenshot and is absent from the later dashboard with an empty search and All statuses selected. The student explicitly confirmed completing deletion and checking the original results. Marked the confirmed-deletion and closed-history submission checks complete on this manual evidence. Cancellation, deletion with responses, and archiving this closed survey remain distinct unverified subcases. No new assistant browser/API check was performed. The account-identifying dashboard screenshot was not copied into the public repository.

## Student keyboard and browser checks — November 5

The student reported the instructed keyboard workflow worked as expected, using Space to select student radio options. That key behavior is expected. Desktop Edge and Chrome worked, an iPhone browser workflow worked, and the instructor dashboard opened in Chrome. The report mentioned Safari/Chrome on iPhone without a precise separate run sequence. Recorded the basic keyboard, mobile and second-browser checks as student-reported passes, supported by the earlier matching fictional results screenshots. No new assistant browser, database or automated test was run for this update. Extended accessibility, exact browser versions and exhaustive viewport coverage were not established. The two confirmed audit defects still need fixes and affected-workflow retesting.

## Fixing the two workflow defects — November 5

Added intended-behavior tests before the fixes. The focused run had 5 failures and 32 passes, reproducing editable pending answers and the loss of a valid presentation after count errors. Student question fieldsets are now disabled while submission is pending and unlocked on failure. Tests attempt a conflicting answer click, check the submitted payload, and verify a failed request can be retried with a changed answer and the same browser token.

Presentation loading now separates count errors from survey/QR validation errors. A count-only failure clears the count to an explicit unavailable indicator, retains the QR and instructor actions, and explains that polling retries automatically. A closed/inaccessible survey still hides the presentation. Tests cover missing counts, initial and polled failures, recovery, and closing despite a count error.

The two focused files passed 37 tests after the fixes. The full suite passed 108 tests across 8 files in 47.86 seconds with one worker and a 20-second timeout; the production build passed with the existing approximately 903 kB bundle warning. These are mocked component/transport checks, not new live fault injection. Deployment and an affected public-workflow smoke check are tracked separately. No database schema or policies changed; the known overlapping draft-save risk remains disclosed.

## Updated database evidence — November 5

The student supplied a clear Table Editor screenshot showing all required table names and two saved `Survey Test` rows with closed status. Saved it unchanged as `docs/evidence/01-database-surveys.png`; no credentials, browser tokens or account email are visible. UUIDs and descriptions are partly truncated, so this image establishes table existence and saved surveys, while linked-question/response evidence is collected separately. The original phone/computer survey ID observed in Table Editor is `47bf2335-910a-434d-b521-ecd3caf81da4`; the second row is the keyboard test copy. Older screenshots are retained.

Saved the student's next screenshot unchanged as `docs/evidence/02-database-questions.png`. It shows the original question “Are you using a phone or a computer,” its multiple-choice type and its survey reference. The full `survey_id` read in the preceding Table Editor observation matches the original survey, although the screenshot clips the UUID. No credentials, browser tokens or account email are visible. This new image shows multiple-choice data only; earlier true/false evidence is retained separately.

Prepared a new SQL Editor snippet and ran the read-only query saved in `docs/evidence/stored-responses.sql`. The live result returned 2 rows for the original survey, with distinct response IDs, timestamps, the matching phone/computer question, and answers Phone and Computer. This directly verifies stored fictional submissions and answer relationships after closing. The query excludes browser tokens and credentials and does not alter survey data. The result was left visible in the integrated browser for the student to capture; the new response screenshot is not yet collected. This administrator read does not test anonymous or non-instructor access restrictions.

The student then supplied the response screenshot, saved unchanged as `docs/evidence/03-database-responses.png`. The query and both result rows are readable, including distinct response IDs, timestamps, the question and Phone/Computer answers. No pop-up obscures the records, and no browser tokens, credentials or account email are shown. Marked current stored-response screenshot evidence complete; the matching application results screenshot remains to be collected. Database timestamps are displayed in UTC.

Saved the student's matching app results screenshot unchanged as `docs/evidence/04-app-results.png`. It clearly shows `Survey Test`, 2 responses, the phone/computer question and chart, and one Phone and one Computer response at 50% each. These values match the live stored-response query. No account email, credentials or browser token are visible. All four current required evidence screenshots are now collected and indexed in the evidence README. This completes screenshot collection, not the remaining security cases, post-fix public workflow checks, personal write-up review, private instructor access or HuskyCT submission.

## Dedicated instructor test account verification — November 5

The student created a separate test account with a reserved example-domain login and a password entered directly in the browser. A prior account using an uncontrolled email was not enrolled; its prepared grant was replaced with comments without being run. After the student's explicit permission confirmation, the replacement account's allowlist insertion returned its expected user ID. The student signed in on the public app. The assistant observed the correct test-account session and opened the original survey's results: 2 responses, Phone 1/50% and Computer 1/50%.

Using that session, created `TEST — Instructor access verification`, survey ID `9fd1fa02-d618-42c5-bab0-10c813d8c1e2`, with a true/false question. Saving succeeded. Reloading the dashboard and reopening Edit retained the title, question, selected True/False type and both generated choices. The draft remains inactive and was not submitted, activated or deleted. This verifies authenticated instructor read and draft-write access; it does not cover an unlisted authenticated user's API restrictions or post-fix student/presentation error injection. No passwords were read, logged or committed. Private credential delivery is still pending.
