# AI Development History

This is a summary of the actual work in the Codex chat; it is not a verbatim transcript.

1. The assignment and five specifications were supplied. The repository was initially empty, so the documents were copied in and the prechecked TODO was reset.
2. The student asked for a workflow that included understanding the tools and improving code review. The agent researched NVIDIA's independent and cross-review approach and proposed milestone walkthroughs and a bounded reviewer experiment.
3. The agent generated the React/TypeScript app, Supabase SQL migration, tests, and setup documentation. An independent reviewer identified results pagination and instructor-authorization concerns; the implementation was adjusted.
4. A direct review agent examined small TypeScript, React, and SQL cases and found three seeded defects while leaving the correct control unflagged. The existing custom Gemma worker was not run because its Docker engine was unavailable. A second comparison was invalidated because the reviewer inherited earlier findings.
5. The student created a free Supabase project and instructor credentials. The schema was applied, anonymous access was checked, and a sample survey was created, activated, and submitted.
6. The student chose GitHub Pages instead of Cloudflare Pages. The agent adjusted routing and QR links, added a GitHub Actions deployment, and checked a public student submission and duplicate rejection.
7. The student signed in to the production instructor dashboard. The agent checked the sample results and presentation page. Additional manual checks and submission evidence remain in TODO.md.

8. The student confirmed that a phone scan opened the deployed survey. A fresh reviewer without prior chat context repeated the synthetic review with an expanded prompt; the small result matched the baseline and did not establish an improvement.


9. The student requested more edge cases and browser checks. The agent created a two-question test survey, tested editing and submissions, verified that closed surveys reject access, captured database evidence, checked a downloaded CSV, and verified signed-out browser access and protected routes. Remaining checks are recorded in the browser test cases.

10. The student tested the active survey on a phone and confirmed that a submission displayed the thank-you page.

11. The student requested more testing. The agent added student-component cases, found and fixed failure handling for rejected load and submission requests, and incorporated independent review feedback on asynchronous tests and supported Node versions.

12. Additional results-page tests reproduced a stale-request race when switching surveys. The agent added request-version checks and retry behavior, tested counts and export consistency with mocks, and requested an independent review.

13. The agent added editor tests and, following independent review, protected failed draft loads and controls during saves. The reviewer identified a remaining navigation and overlapping-save risk, which is recorded for further work.

14. Authentication tests and independent review found rejected-session recovery problems and an indirect dependency between student requests and instructor authentication. The agent added retry handling, isolated the student client, and added component and stubbed-network tests.

15. Presentation-page tests and independent review identified close-update and polling edge cases. The agent guarded stale requests, detected zero-row updates, preserved close errors, and added count-loading behavior; a live close check remains pending.

16. The agent added dashboard tests, improved failed-load recovery and guarded stale actions, then independently reviewed remaining cross-tab concurrency and live integration limitations.

17. The agent expanded simulated-network Supabase client checks and incorporated independent review to verify that requests reached the simulated transport, error codes were retained, and instructor tokens were not forwarded.

18. Further tests covered editor validation and ordering, dashboard actions, student retries, results refresh, and authentication. A full run initially had timeout failures; a repeat with one worker and a longer timeout passed 104 tests.

19. The student authorized final checks. The agent archived and duplicated a disposable survey, activated the copy, submitted a fictional response, verified its results, and opened a previous CSV in Excel. The close confirmation stalled; close and delete checks remain open. The concurrent draft-save risk was disclosed. The student is helping reopen Supabase because its dashboard stalled in the agent browser.

20. The student supplied the rubric again and requested another audit plus the updated Gemma workers. The worker rejected the original project location, then accepted a source-only copy under its permitted workspace but could not start because Docker failed during startup with a stale socket error. No Gemma review ran. Two fresh direct reviewers inspected the fixed source independently; the coordinator reproduced editable answers during pending submission and a count-only error hiding the QR presentation with two focused mocked tests. The existing 104 tests, build, dependency-advisory scan, CI and bounded credential-pattern scan passed. No application fix or new live browser/database check was claimed; findings and the remaining deliverables were saved in the additional rubric/code audit.

21. The student completed the manual close and disposable-copy deletion checks and supplied before/after screenshots. The original `Survey Test` remained closed with 2 responses; the student URL was unavailable; the deleted `TEST — DELETE ME` draft no longer appeared on the dashboard. The agent updated the checklist and test record based on this student-operated evidence, without claiming additional live automation or unperformed subcases.

22. The student reported successful Tab navigation and Space selection of student radio options, working desktop Edge and Chrome workflows, a working iPhone browser workflow, and instructor dashboard access in Chrome. The agent explained that Space is expected for radio selection and recorded basic keyboard/mobile/browser passes without claiming full accessibility coverage or a new assistant-controlled test. The two open audit fixes remained unchanged.

23. The student requested guidance through the remaining steps. The agent implemented the two workflow fixes after adding regression tests that failed on the old behavior: question controls lock during pending submission and unlock on failure, while presentation count errors preserve a valid QR and actions with automatic-retry feedback. Closed-survey validation remains intact. The focused tests, full 108-test suite and production build passed; the known draft-save conflict and remaining live/security/evidence work stayed explicit.

24. The agent guided the student through capturing four current evidence screenshots: database tables/surveys, linked questions, stored responses and matching app results. A read-only SQL join showed the two fictional Phone/Computer answers without browser tokens; the app showed 2 responses with 50% for each answer. The screenshots were saved in `docs/evidence/` and committed. The student reviewed both the development summary and this AI history and confirmed they looked accurate. Private instructor access and final submission remained separate steps.

25. The student requested a dedicated instructor test account. An initial login used an email the student did not control, so its prepared instructor grant was cancelled without execution. A replacement account used a reserved example-domain address and a new password entered directly by the student. After explicit confirmation, the agent enrolled that account in the instructor allowlist and verified its live sign-in, existing results access, and creation/reopening of a persisted true/false test draft. The draft was left inactive. Credentials were excluded from repository documentation and the submission package; private delivery and final submission remained for the student.
