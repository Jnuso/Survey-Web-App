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
