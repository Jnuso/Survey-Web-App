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
