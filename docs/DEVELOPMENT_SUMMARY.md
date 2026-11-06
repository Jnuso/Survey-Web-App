# Development Summary

## Goal and specifications

The project builds an instructor-managed classroom survey app. The supplied specification, database, API, UI, and TODO documents guided the data model, screens, security rules, and test workflow. The original checklist contained prechecked items, so it was reset to reflect this repository's actual progress.

## Architecture and AI assistance

Codex generated the React and TypeScript interface, Supabase migration, deployment workflow, and documentation, with independent agent reviews of the code. React renders the instructor and student pages, while Vite builds the site. The browser communicates with Supabase through its JavaScript client using a public key. Supabase Auth signs in instructors; PostgreSQL stores the surveys, questions, choices, responses, and answers.

The database uses row-level security and an explicit instructor allowlist. Students can read active survey content without an account. A database function validates and saves a response and its answers in one transaction, and a browser token helps prevent accidental repeat submissions. The token is not a guarantee of one response per person, because a participant can use another browser or clear local storage.

## Configuration, problem solving, and deployment

A dedicated free Supabase project was created. Its SQL editor was used to apply the schema migration, and an instructor account was enrolled in the allowlist. Public-client checks showed that anonymous users could read an active survey and submit a response, but could not read responses, insert surveys directly, or submit the same browser token twice.

An independent review found that the first results query might omit records above the API's response limit, and that trusting every authenticated account would grant too much access. The implementation was changed to require an instructor allowlist. Response pagination was later replaced with one instructor-only database snapshot so results and CSV use a consistent view. A rollback-only check covered 601 responses; concurrent-load testing remains outstanding. Navigation away from an in-flight draft save remains a known risk: a later failure may go unreported, and overlapping saves of the same draft, including from multiple tabs, can overwrite changes. Until version-based conflict detection is implemented, wait for saving to finish and avoid editing the same draft in multiple tabs.

The original plan used Cloudflare Pages; the hosting choice was changed to GitHub Pages. GitHub Actions runs the tests and builds and publishes the React application. The Vite base path and hash-based routes support this repository's project URL, including student QR links. The deployed site is https://jnuso.github.io/Survey-Web-App/.

## Verification and learning

The production build and 104 automated tests passed with one worker and a 20-second timeout, including CSV, student-form, authentication, results-page, editor, presentation, and dashboard cases; the component cases use a mocked backend. A labeled sample survey was created and activated; student responses were saved, a duplicate was rejected, and the instructor results displayed the correct counts and percentages. The public presentation page displayed the production survey URL and response count. The student scanned the QR code on a phone and confirmed the survey opened. A signed-out browser submission succeeded and protected instructor routes redirected to sign-in. A downloaded CSV contained the expected test response. The student completed the final manual phone/browser workflow and supplied matching fictional results showing one Phone and one Computer response at 50% each. Archive was verified live on a disposable draft. The student subsequently completed close and disposable-copy deletion manually, supplying screenshots showing the original survey closed with 2 responses retained and the deleted copy absent. The student reported successful Tab navigation with Space for radio selection, working desktop Edge and Chrome and iPhone workflows, and instructor dashboard access in Chrome. Extended accessibility and additional scenarios remain open; see TODO.md and the learning log.

This project illustrates how a frontend, a hosted database, authentication, and a hosting service cooperate: the frontend provides the interface, while access rules and database functions enforce the important data restrictions. Independent AI review can surface defects, but tests and direct verification are needed to evaluate each finding.

A November 5 follow-up audit reproduced two additional workflow defects with mocked requests: answer choices remain editable during submission, and a count-only failure hides a valid QR presentation. Fixes and the remaining live checks/evidence are tracked in the final checklist. The updated Gemma worker could not start because Docker failed locally; direct reviewers provided the independent review instead. No new student-access bypass was identified in that static review, which does not establish deployed security.

