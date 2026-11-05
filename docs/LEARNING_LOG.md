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
