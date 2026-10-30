# Learning and development log

## Phase 1 — Architecture and setup

The assignment separates the interface from data storage. React builds pages from components; TypeScript checks types; Vite runs and builds the app. Git tracks source history, and GitHub hosts the repository. Supabase provides PostgreSQL (relational tables and constraints), authentication, and a browser-facing API. Cloudflare Pages will host the built frontend.

The inherited TODO checkmarks were reset because this repository started empty. The five supplied specifications remain in the project. Exercise: open `DATABASE.md` and trace how a survey connects to questions, responses, and answers.

## Phases 2–5 — Implementation underway

The app routes and database migration have been authored, but they are not yet verified against a real Supabase project. A browser sends a submission to a database function; the function checks that the survey is active and that choices belong to its questions, then inserts the response and answers in one transaction. Instructor accounts are explicitly enrolled in `public.instructors`.

Review: an independent agent identified possible result truncation and overbroad instructor access. The code was adjusted to load response pages and require an instructor allowlist. These adjustments still need integration tests. Exercise: trace `submit_survey_response` from the student page to the SQL function, then identify where it rejects a duplicate.

## Reviewer experiment

A blind direct-agent review received only four synthetic cases, not the answer key. It identified all three seeded defects and correctly reported no finding for the control. This is a tiny illustrative result, not an accuracy estimate; no tests were run by that reviewer. The existing custom worker's Docker-based execution was unavailable, so no comparable Gemma baseline has run. See `reviewer-experiment/` for the cases, key, and protocol.

## Remaining evidence

Record real Supabase setup, tests, deployment, and issues resolved as they occur. Screenshots and final submission statements must reflect actual results; no credentials or private student data should be included.

## Verification recorded October 30, 2026

`npm run build` passed, with a bundle-size warning; the landing page and sign-in page were checked in a local browser using placeholder public configuration. `npm test` passed two CSV tests. `npm audit` reported zero vulnerabilities after updating the test runner. Database behavior, authentication, real results, mobile use, and deployment remain unverified.

## Supabase connection — October 30, 2026

Created a dedicated Supabase project and applied the initial schema. Supabase Table Editor shows surveys, questions, choices, responses, answers, and instructors. The app's ignored local `.env` now contains the project URL and publishable key; no service-role key was used.

A public-client check found that survey, question, and choice queries succeeded with zero rows; queries for responses and answers failed with permission code 42501, as did an attempted anonymous survey insert. This confirms only the tested empty-database access cases. Active survey reads, instructor access, submissions, and persistence remain to be checked with test data.

A rollback-only SQL integration check then created a disposable draft through `save_survey`, activated it, submitted an answer, confirmed its answer row, and checked that a duplicate browser token was rejected. The transaction was rolled back. The instructor account was enrolled in the allowlist. These checks do not replace a browser-based workflow, tests of active survey public reads, or live deployment tests.

## End-to-end local sample

Signed in with the enrolled instructor account, created and activated `Sample: Classroom Check-In`, opened its presentation page, submitted a sample answer through the student page, and saw one response and 100% for the selected choice in the results. A separate anonymous Supabase client read the active survey, submitted another sample answer, was refused on a second submission with the same token, and could not read responses. The sample survey and two sample responses remain in the project, clearly labeled for testing; no real student data was used. The QR code currently points to localhost and is not yet suitable for classroom use.
