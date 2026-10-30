# Gemma code and workflow review

## Goal

Use the existing Gemma `coding-agents` review worker to inspect the complete survey application in small, bounded reviews. Codex coordinates, verifies every reported issue against the exact source snapshot and relevant tests, and explains findings to the student before applying fixes. A reviewer finding, a completed job, and a passed application test are different kinds of evidence.

## Preconditions

1. Start Docker Desktop with the Linux engine and confirm `docker info --format '{{.OSType}}'` returns `linux`. The worker requires Docker; do not substitute host execution. If the engine remains unavailable, do not start a job or claim that Gemma reviewed the app.
2. Check that `coding-agents` is available and its allowed roots permit the app repository. If the repository path is rejected, arrange a sanitized project snapshot within an allowed root or configure access using the worker's documented setup; do not copy `.env`, credentials, Git metadata, caches, or node_modules. The global worker configuration lives outside this assignment folder and should not be silently changed.
3. Identify the source commit and require a clean working tree or record the exact diff included in the snapshot. Never provide `.env`, passwords, session tokens, database credentials, or private responses. The Supabase publishable key is not a service-role key, but still check what the worker sees before submitting any material to an external model.
4. Respect the configured model pacing and free-tier quotas. Start one short review job first. Record the model, source commit, job ID, start/end times, call limit and usage, status, and errors. Do not interpret an empty Python pytest run as verification of React, TypeScript, SQL, or browser behavior.

## Shared instructions for each job

Use review profile and read-only review; do not modify project files or suggest broad rewrites. Review each concern against the specifications and source snapshot. Report only concrete, actionable problems with file and line, trigger or sequence, expected versus actual behavior, impact/severity, and a suggested verification or fix. State what could not be checked, including missing source context. Distinguish observed behavior from inference and pre-existing design limitations. Do not claim code or browser tests were run without actual output.

## Review lanes

1. **App shell and authentication:** configuration, Vite base path, routing, session handling, protected routes, sign-in/sign-out, and error/loading states. Trace unauthenticated, unauthorized, and expired-session behavior.
2. **Instructor lifecycle and editor:** create, edit, validate and reorder questions/choices, save, duplicate, search/filter, activate, close, archive, and delete. Check asynchronous failures, state preservation, destructive confirmations, and history.
3. **Student and QR flow:** production QR URL and route, active/closed handling, required answers, browser token generation, duplicate handling, submission errors, accessibility, and mobile concerns. Trace from QR to successful persistence.
4. **Database and security:** schema constraints, foreign keys, RLS and privileges, instructor allowlist, `save_survey`, activation concurrency, atomic submissions, choice-to-question relationships, duplicate prevention, and close/submit races. Check threat scenarios without actual student data.
5. **Results and export:** response pagination, concurrent changes, counts, percentages, missing answers, historical results, CSV escaping, and spreadsheet formula safety. Trace saved answers to displayed/exported values.
6. **Deployment and cross-component flow:** GitHub Actions configuration, public client environment variables, static hosting/base paths, links on direct navigation, and frontend-to-RPC contract. Trace a survey through creation, activation, two student submissions, results, CSV, closing, and historical access.

Submit lanes sequentially or within the actual shared model quota and capacity. Keep each assignment bounded to its lane; provide only relevant files and contracts, but include related callers and database interfaces where necessary. A Python-oriented worker may be useful for static reasoning yet cannot establish application runtime correctness on its own.

## Cross-review and reconciliation

- Save each unedited Gemma report. Independently reproduce or refute each finding using source inspection and focused tests; record confirmed, rejected, uncertain, and duplicate findings with evidence.
- For high-impact issues, have a separate reviewer inspect the same fixed snapshot and independently challenge the claim before seeing the first review. Agreement alone is not proof.
- Fix confirmed issues in the actual app only after examining the report and any diff. Re-run appropriate build, application, database, and browser checks. Never blindly apply worker edits; check snapshot conflicts if a worker produces them.
- Record important limitations, actual tests, missed cases, and false positives. Compare the review with the synthetic baseline in `reviewer-experiment/README.md` without claiming a statistically meaningful accuracy score.
- Explain each confirmed issue in plain language: which feature it affects, how the code/data flows, why it fails, how the fix works, and how the evidence demonstrates it.

## Current execution status

Not started. On October 30, 2026, Docker Desktop was requested to start, but the Linux engine was still unreachable on the initial checks. No Gemma code or workflow review has been performed for this app. The existing custom worker is Python-oriented and is not equivalent to a browser or database integration test.
