# Final submission audit — November 5, 2026

## Verdict

The core app is implemented and deployed. It is not yet fully verified for submission. Finish the live checks and evidence below, then review the write-ups and provide private instructor access. This audit reviewed current files and the current commit's GitHub checks; it did not rerun the browser workflow or change database data.

Audited application commit: `2c10348df54bc1eaf5e62619684b57f33828c79b`.

## Current evidence

- The working tree was clean at audit start. GitHub Actions [run 42005845876](https://github.com/Jnuso/Survey-Web-App/actions/runs/42005845876) succeeded for that commit. Its install, default `npm test`, production build, and Pages deployment steps all succeeded.
- The last local full suite passed 104 tests with one worker and a 20-second timeout. An earlier local run had three timeouts and a subsequent failure; the repeat and current CI passed. Component tests use mocked services; SDK transport tests use simulated HTTP responses.
- Live work recorded in the learning log includes instructor sign-in, draft creation/editing, both question types, duplication, activation, student submission, duplicate rejection, results, QR presentation, and persistence. Archive was verified on a disposable draft on November 5.
- Excel opened the downloaded fictional-response CSV into separate columns. The full raw CSV values were checked; default Excel widths clipped long headers and IDs visually.
- Anonymous response/answer reads and results access were denied in prior live API checks. Rollback-only SQL tests simulated an authenticated non-instructor: zero response/answer rows, zero survey rows updated, and AUTH_REQUIRED from the results function. A real separately authenticated non-instructor API session remains untested.
- Existing evidence files and the development summary and AI interaction history are tracked. The stored-response screenshot is partly covered by a pop-up and should be replaced or supplemented.

## Finish in this order

### 1. Close the active disposable survey

At the last live inspection, `Copy of TEST - Disposable lifecycle verification` was active with one fictional Yes response. Open the deployed dashboard and inspect its current state first. The known ID is `8d4e6c53-d8af-4ac5-8d13-92f2e968315e`.

Click Present, then Close survey and confirm. The automation repeatedly failed to handle the browser confirmation; that does not prove an application defect or success. Verify the dashboard says closed, results still show the response, and its student URL reports unavailable. If an error appears, record the exact message and stop before claiming a pass.

### 2. Verify deletion using a different disposable draft

Create or duplicate a clearly labeled TEST draft, confirm it has no evidence you need, then delete it. Deletion is permanent and cascades to associated data. Verify it disappears after reloading the dashboard. Keep the existing historical samples and response evidence.

### 3. Repeat the complete phone workflow once

Create a fresh fictional survey, save and reload it, activate it, and scan its QR on the phone. Activating it closes any prior active survey. Submit a distinctive fictional answer and verify the count and answer in instructor results after refresh/reload. Export that same survey's CSV and compare it with results. Previous phone success was reported, but anonymous totals cannot establish which old response came from the phone. A new controlled check is clearer than identifying old records.

### 4. Capture clear evidence

In Supabase, show the tables, a survey linked to questions, and a stored fictional response. Include readable column headings and enough matching IDs or titles to demonstrate relationships. A count-only query is useful supporting evidence but is weaker than a visible response record linked to its survey. Replace or supplement `database-response-evidence.png`; keep the original until the replacement has been inspected. Capture the matching results page. Exclude tokens, credentials, account details, and private student information.

### 5. Complete or disclose remaining verification

Check the student and instructor pages with keyboard navigation and another browser, including visible focus and narrow-screen readability. A physical-phone check does not establish a complete accessibility audit. Where feasible, verify denied results/writes with a real non-instructor account; the SQL-role simulation covers database behavior but not the full login/API integration. Keep unperformed cases explicitly marked unverified.

### 6. Review and submit

Review `DEVELOPMENT_SUMMARY.md` and `AI_DEVELOPMENT_HISTORY.md` for accuracy and your understanding. Arrange instructor test access privately. Include repository URL, public app URL, the required write-ups, and database/results screenshots in the format requested in HuskyCT. Confirm the current deployment and pushed commit when submitting. Do not upload passwords or secret keys.

## Known limitation to retain in the write-up

The editor has no revision-based conflict detection. Editing the same draft in multiple tabs, or reopening it before an earlier save finishes, can overwrite changes; a failure after leaving can go unnoticed. Wait for each save and use one tab per draft. The limitation is disclosed, not fixed. Status filters on update/delete operations do not detect another edit that leaves the status unchanged.

## Roadmap items versus submission gates

The supplied roadmap still contains additional work such as date filters, CSV survey metadata, lint configuration, and extensive concurrency/load/accessibility checks. The assignment's core feature list does not name every roadmap item, but it says to follow the supplied specifications: retain these as explicit deviations or unfinished items, and confirm any instructor-specific expectations. Gemma/Docker reviewer work and post-MVP extensions are not necessary to demonstrate the core app.

## Audit corrections

Corrected stale roadmap entries for implemented public identifiers/URLs and unavailable-survey messages; marked the Excel export check complete; clarified that only drafts are editable; reopened the explicit close-button verification item. The audit made documentation changes only. It did not submit the assignment or mark untested live behavior complete.
