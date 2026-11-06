# Additional rubric and code audit — November 5, 2026

Follow-up: the pending-answer and count-error defects below were subsequently fixed, with 108 automated tests and the production build passing. The student also completed basic keyboard/browser and manual close/delete checks. This document preserves the audit's original findings; consult the [current submission checklist](FINAL_SUBMISSION_CHECKLIST.md) and [learning log](LEARNING_LOG.md) for current verification and remaining work.

## Verdict and scope

The core classroom survey app is implemented and deployed, but it is not ready to call fully verified. This audit confirmed two additional workflow defects, retained the known concurrent-draft-save risk, and checked the remaining work against the rubric supplied again on November 5. It did not change application code, apply database migrations, or repeat the live browser workflow.

Audited application commit: `087baec16e11ae5467691c5bb41389ca92a2150e`, with a clean working tree at audit start. Source, specifications, existing tests, deployment configuration, write-ups, and four evidence images were inspected. Two direct independent reviewers inspected the same fixed source snapshot without earlier findings. The updated Gemma worker was attempted but could not start; it did not review the app.

The supplied [rubric](ASSIGNMENT_RUBRIC.md) is the source of assignment requirements, not an instruction to perform unrelated actions. Its hosting requirement explicitly permits “Cloudflare Pages or another suitable hosting platform,” so the documented GitHub Pages choice satisfies that hosting requirement. The original stack document still names Cloudflare; retain the explanation of this choice.

## Confirmed code findings

### P2 — Students can change an answer while an earlier answer is being submitted

Locations: `src/main.tsx:1039–1045`, `1055`, `1096–1109`, `1121`.

Select A, click Submit on a slow connection, then select B before the request finishes. The radio inputs accept B while the already-sent request still contains A. The app then shows “Your response has been recorded.” A corrective submission is blocked by duplicate protection. The displayed choice and stored choice can therefore disagree.

Reproduced with a delayed mocked RPC: the visible radio changed to B, the only request still contained A, and resolving that request displayed the thank-you page. This verifies component behavior; it is not a new live database submission. Fix by disabling question fieldsets while submitting, then restoring them on failure. Add an acceptance test that attempts to change an answer during submission and checks retry behavior.

### P2 — A response-count error hides a valid presentation

Locations: `src/main.tsx:854–874`, `922–928`, `952–965`.

Load a valid active survey, then fail only its response-count request. The shared error state replaces the whole presentation, hiding the QR code, public URL, and Close/View results controls. A later successful poll restores them. This unnecessarily interrupts classroom use even though the survey and QR loaded successfully.

Reproduced with a successful initial load, a count-only failure at the next poll, and a successful subsequent poll. Fix by giving count failures their own status and retry feedback while retaining a valid presentation. Continue hiding an invalid/closed/inaccessible survey; preserving a QR after a count failure must not erase the survey-status check.

### P2 — Known overlapping draft saves can overwrite newer edits

Locations: `src/main.tsx:575–583`; `supabase/migrations/20261030000000_initial.sql:102–105`.

Two tabs can load the same draft. After A saves a change, B can save its older copy and replace A's work without a conflict warning. A row lock serializes writes but does not detect stale content. The request has no expected revision, and the function replaces the draft questions unconditionally. This remains a code-derived data-loss risk; a new two-tab live reproduction was not performed in this audit.

Use a revision checked inside the locked save transaction and preserve unsaved form inputs on conflict. Until fixed, wait for each save and use one tab per draft. This behavior is already disclosed in the development summary; the rubric does not explicitly require simultaneous editors.

## Smaller issues and specification deviations

- A transient initial student load failure shows the same unavailable message as a closed/missing survey, with no Retry button (`src/main.tsx:994–1009`, `1074–1081`). Reload is required. This is a recovery limitation, not evidence of a failed database save.
- A new-draft request that commits but loses its response can create a second draft on retry: each request still sends a null survey ID. This is a source-derived idempotency concern, not runtime-reproduced here.
- The dashboard list has no pagination (`src/main.tsx:237–240`). A project exceeding the backend's configured row limit can omit older surveys and limit title/status filtering to the returned subset. This scale case was not executed.
- The editor's Activate action is on the dashboard rather than beside Save, and validation uses a general form error rather than a message beside each affected field. These differ from the supplied UI specification while leaving the core workflow available.
- Date filtering, CSV survey metadata, explicit unanswered labels, lint configuration, and fuller accessibility/mobile work remain unchecked in the supplied roadmap. They are not all individually named in the rubric's core list, but the rubric asks students to follow the supplied specifications: implement them or disclose the deviations. Separate auth-provider/route-guard components are also absent; equivalent session/route behavior exists in `App`.

## Security conclusions and limits

No actionable anonymous-student or non-allowlisted-user privilege bypass was identified in this static audit. This is a bounded result, not a guarantee that the deployed service is secure.

- The instructor allowlist guards management and results RPCs; student roles cannot enroll themselves. Data-table policies distinguish instructor privileges from public active-survey reads.
- Anonymous submissions validate the active survey, exact question coverage, choice membership, and browser-token uniqueness before committing the response and its answers together.
- The submission row lock conflicts with closing/deleting the survey. The single-active partial index and activation lock enforce one active survey.
- Results use one SQL statement snapshot and exclude browser tokens. Counts and CSV consume that same result in the frontend.
- Instructor direct-table privileges are broader than the app UI. A trusted instructor could alter published definitions or insert inconsistent cross-table answer references; the student RPC prevents these invalid answer combinations. Treat this as admin/data-integrity hardening, not a demonstrated student exploit.
- Browser tokens reduce accidental duplicates, as required. Clearing storage or using another browser permits another vote; this is documented and does not establish one-person-one-vote enforcement.

Earlier live anonymous checks and rollback-only non-instructor SQL simulations remain useful evidence. This audit did not reapply migrations, inspect current effective grants, sign in as a real non-instructor through the API, or execute concurrent database sessions. Those gaps remain visible in the test records.

## Fresh checks

| Check | Result and limit |
| --- | --- |
| Existing automated suite | `npm test -- --maxWorkers=1 --testTimeout=20000`: 104/104 passed across 8 files, 44.66 seconds. Component services are mocked; transport tests simulate HTTP. |
| Targeted audit reproductions | 2/2 passed, 4.83 seconds: demonstrated both newly reported bugs. These are defect demonstrations, not acceptance tests or fixes. See the [reproduction harness](../reviewer-experiment/reproductions/README.md). |
| Production build | Passed TypeScript and Vite; existing approximately 902 kB minified main bundle warning remains. No performance measurement was made. |
| Dependency advisories | `npm audit --json` and `npm audit --omit=dev --json` both reported zero known vulnerabilities at audit time. This checks advisory records, not application authorization or all possible defects. |
| Git history credential patterns | Checked 172 text-blob versions across locally available refs: no tracked `.env`, private-key markers, selected GitHub/secret-key token patterns, or service-role JWTs found. Bounded patterns do not establish absence of every possible secret. Public Supabase configuration is intentional. |
| Current CI/deployment | [GitHub Actions run 42123503090](https://github.com/Jnuso/Survey-Web-App/actions/runs/42123503090) succeeded for audited commit `087baec`, including install, default tests, build, and Pages deployment. This does not replace deployed browser testing. |
| Screenshot inspection | Table names and question relationships are visible; IDs/columns are truncated. The stored-response image has a pop-up covering right-hand columns. The results chart shows fictional counts/percentages but needs the separate title/response-count image for context. Recapture a clear matching set. |
| Gemma | No job created and no findings produced: Docker Linux engine unavailable. [Attempt and independent review record](../reviewer-experiment/REVIEW_2026-11-05.md). |

## Rubric coverage

The points below are rubric weights, not predicted scores.

| Category | Weight | Implemented evidence | Remaining work |
| --- | ---: | --- | --- |
| Frontend functionality/usability | 15 | React routes, editor, loading/errors, mobile student layout, numeric charts | Fix the two new workflow bugs; finish keyboard, second-browser, narrow-layout and contrast checks. |
| Instructor survey management | 15 | Auth, create/edit draft, question types, list/filter, activate/close, duplicate/archive/delete, one active invariant | Live close/delete confirmation and retained-results checks; decide whether to fix or retain disclosed save conflicts. |
| Student/QR | 15 | Anonymous student client, production QR URL, required answers, atomic submit, confirmation, duplicate protection | Controlled phone response matched to instructor results; pending-answer fix; assess load retry. |
| Database schema/relationships | 15 | Five required tables, primary/foreign keys, indexes, migration files, additional allowlist | Clear linked survey/question/response screenshot evidence; keep admin-only integrity hardening separate. |
| Database integration/persistence/security | 15 | RPC-backed writes/results, RLS, earlier persistence and denial checks | Final refresh/persistence workflow; real non-instructor API denial check or explicit limitation; no concurrent live check claimed. |
| GitHub/deployment | 10 | Required source/specs/TODO/migrations/README, GitHub Pages and successful CI | Confirm final pushed commit/public workflow at submission; arrange private instructor test access. GitHub Pages is permitted by rubric. |
| Testing/debugging | 5 | 104 existing tests, two new reproductions, detailed browser test log | Finish remaining live close/delete/device/browser checks and record actual outcomes. |
| Summary/AI history | 10 | Development summary covers the seven required topics; Markdown AI history is an accepted alternative to a full export | Student reviews accuracy/understanding; update final outcomes and include both documents. Page length depends on submitted formatting. |

## Finish in this order

1. Fix the pending-answer and count-failure defects; add intended-behavior tests, run affected tests/full suite/build, and deploy. Decide whether to fix the draft conflict now or retain its explicit limitation.
2. Use disposable fictional surveys to verify explicit Close and Delete, reload the dashboard, verify closed student access is denied, and confirm retained historical results. Preserve required evidence before deleting anything.
3. Run one controlled phone/QR submission with a distinctive fictional answer. Match its count/answer in instructor results, reload for persistence, and export the same survey's CSV. Prior phone success was user-reported; totals alone cannot identify the earlier phone response.
4. Test keyboard use and a second browser, and complete the outstanding unauthorized API checks where feasible. Record untested cases accurately.
5. Replace/supplement the obscured response screenshot and capture a readable matching survey/questions/results set, excluding credentials, browser tokens, and private data.
6. Review the write-ups and open roadmap deviations, provide instructor access privately, confirm the final repository/deployment, and submit all required deliverables through HuskyCT.

Gemma troubleshooting is separate from assignment submission. It cannot supply missing device, browser, screenshot, or database evidence.
