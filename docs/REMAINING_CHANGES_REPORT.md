# Remaining changes implementation report

This report supersedes the missing-feature and same-draft-overwrite findings in the earlier final audit. Existing historical logs describe the code at the time they were written.

## Implemented

- Inclusive local-calendar creation-date filters combine with dashboard search/status.
- CSV appends survey ID, title, description, status, and creation time after the existing response/question columns; all cells retain quote/formula escaping. Empty exports have headers only.
- Results explicitly show answered/unanswered counts; missing or invalid historical choices count as unanswered. Counts are collected once per question rather than scanning every response for each choice.
- Editor Save and activate saves first, then activates. If activation fails, retry uses the saved draft ID/version rather than creating another draft. Required-field messages appear beside the title, question, and answer choices.
- Student initial-load failure has a Try again action.
- ESLint configuration, npm run lint, and a required lint step in the Pages deployment workflow.
- Chart and QR packages load on demand. Production initial JS changed from approximately 903 kB to 514 kB minified (266 kB to 150 kB gzip). A remaining size warning is disclosed; size is not a page-load timing measurement.
- Darker muted text and focus outline colors. This is an improvement, not a claim of formal accessibility certification.
- Version-checked draft saves using exact updated_at timestamps and a locked transaction. The private underlying save function cannot be called by authenticated/anonymous roles. Legacy clients can create drafts but cannot update without a version. The migration was applied to the assignment project before frontend release.

## Verification

- Existing 108 tests passed after initial feature changes; six new regression tests cover date endpoints, student retry, draft conflicts, save/activate order, activation retry, and unanswered labels. Final full run passed all 114 tests across eight files. Production build passed (initial JS 513.63 kB minified / 149.75 kB gzip; chart 365.55 kB, QR 25.78 kB are separate chunks).
- ESLint passed.
- Live rollback-only database assertions passed: valid save accepted, stale version rejected, latest title preserved, internal function execute privilege absent. The transaction left no fixture behind. Screenshot: evidence/05-draft-conflict-check.jpg.
- 200 concurrent API clients each performed one active-survey read and one submission; 200/200 succeeded. Mean combined read-and-submit duration 1.189 seconds, p95 1.409 seconds. Database subsequently showed 200 stored / 200 distinct responses. The dedicated fictional fixture was closed and retained as evidence; original surveys were preserved. Screenshot: evidence/06-capacity-persistence.jpg; details: evidence/capacity-check.json.
- An initial invalid test harness used the wrong parameter name and returned HTTP 404 before inserting anything. It was corrected to the actual API contract before the successful capacity run; the failed harness result is preserved separately. It is not an application capacity failure.

## Limits still disclosed

The capacity test is 200 API clients, not 200 interactive browsers. Average public page rendering under two seconds remains unverified. Formal screen-reader, 200% zoom, comprehensive contrast/layout testing, actual non-instructor API login, and deployment fault injection are not established by these changes. Existing student-reported device/browser results still apply to their tested version. Navigation during an in-flight save may hide a later failure, although stale updates are now blocked. Gemma was not newly verified; no reviewer approval is claimed.

## Final hand-in

Use the refreshed submission package, repository URL, deployed app URL, and dedicated instructor credentials supplied privately through HuskyCT. The assistant does not submit coursework on the student's behalf. Remaining verification limits must stay in the write-ups.
