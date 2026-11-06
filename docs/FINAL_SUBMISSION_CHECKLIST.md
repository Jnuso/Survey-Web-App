# Assignment 15 — Final Submission Checklist

Use this short checklist to prepare the HuskyCT submission. The detailed implementation roadmap is in [TODO.md](../TODO.md), and the precise test history is in [Browser Test Cases](BROWSER_TEST_CASES.md). Check an item only after verifying it.

See [Additional rubric/code audit, November 5](RUBRIC_CODE_AUDIT_2026-11-05.md) for the latest findings and rubric mapping; the [earlier final audit](FINAL_AUDIT.md) has the detailed manual workflow.

## Resolve new audit findings

- [x] Disable student answer changes while submission is pending and add acceptance tests. Disabled question fieldsets now keep the visible selection consistent with the sent payload; failure unlocks controls, and retry sends the changed answer with the same browser token.
- [x] Keep a valid presentation usable when only response-count loading fails. Count failures now show an unavailable indicator and automatic-retry feedback; the QR and instructor controls remain available. Tests cover first-load failure, failed polling/recovery, missing counts, usable Close, and hiding a closed survey.
- [x] Run affected tests, the full suite and production build after fixes. The full suite passed 108 tests on November 5; the build passed with the existing bundle-size warning.
- [ ] Verify the deployed fixes and repeat the affected public presentation/student workflows. Automated error/delay cases use mocked services; a new production fault-injection test has not been claimed.
- [ ] Decide whether to fix the known concurrent-draft overwrite risk now or retain its explicit disclosure and one-tab workaround.

## Finish verification

- [ ] Finish the local authenticated browser workflow: save/reopen a fictional draft, submit and check results against hosted Supabase. The [latest local verification](LOCAL_TEST_2026-11-05.md) passed 108 tests, build, dev/preview serving and signed-out route checks. The local page is awaiting the student's test-account sign-in; authenticated workflow completion has not been claimed.

- [x] Complete a controlled fictional phone submission and check the matching results. The student reported that the final phone/browser workflow worked; earlier screenshots of `Survey Test` show 2 responses, one Phone and one Computer at 50% each. This is student-operated evidence, not independent device attribution from anonymous database records.
- [x] Verify close and delete operations using disposable surveys. On November 5, the student manually completed the workflow: screenshots show `Survey Test` closed, its student link unavailable, the `TEST — DELETE ME` copy absent after deletion, and the original results retained with 2 responses. This supersedes the earlier stalled automation check; cancellation and deletion of surveys containing responses remain separate unverified cases.
- [x] Complete the baseline public-app smoke test. On November 5, the student reported the instructed workflows worked in desktop Edge and Chrome and on an iPhone, and confirmed instructor dashboard access in Chrome. Earlier screenshots show the matching fictional survey results. Repeat affected public workflows after the two open code fixes.
- [x] Open the downloaded CSV in a spreadsheet application and verify its columns and answers. Excel displayed separate columns and fictional answers TRUE and Testing on November 5; narrow columns clipped longer values visually, which were verified in the raw CSV.
- [x] Check basic keyboard navigation and a second browser. The student reported Tab navigation worked as expected, Space selected student radio choices, desktop Edge and Chrome worked, and the instructor dashboard opened in Chrome. The iPhone browser workflow also worked; Safari/Chrome were mentioned without a precise browser-by-browser sequence. Screen-reader, 200% zoom, long-content and contrast checks remain separate.
- [x] Disclose the unresolved editor navigation and overlapping-save risk and its workaround in the development summary; a version-based fix remains future work.
- [ ] Review the outstanding access-control cases in the detailed test log. Anonymous response reads and survey writes were denied in earlier checks. A simulated non-instructor SQL role saw no response or answer rows and received AUTH_REQUIRED from the results function; an actual non-instructor API login remains untested.
- [x] Run the local tests and production build. The latest November 5 run passed 108 tests with one worker and a 20-second timeout after the two fixes, and the production build passed with the existing Vite bundle-size warning. Earlier timeout failures remain in the historical log. Repeat affected checks if code changes before submission.

## Prepare required deliverables

- [x] GitHub repository exists: https://github.com/Jnuso/Survey-Web-App
- [x] Public app URL exists: https://jnuso.github.io/Survey-Web-App/
- [ ] Confirm the latest commit is pushed and the public app is working when the assignment is submitted. Confirm no credentials or secret keys are committed.
- [x] Create and verify a dedicated instructor test account. The student entered its password directly; after explicit confirmation it was enrolled in the app instructor allowlist. Live checks verified sign-in, existing results access, draft creation, and persisted true/false question/choices after reload and reopening. No platform-administration access was granted.
- [ ] Provide the dedicated survey-app test login privately in the instructor-approved submission field/channel. Keep its password out of the repository, ZIP, screenshots and chat. The student plans to use HuskyCT if the submission field is private to course staff.
- [x] Review the [development summary](DEVELOPMENT_SUMMARY.md). The student read it and confirmed it looked accurate on November 5.
- [x] Review the [AI development history](AI_DEVELOPMENT_HISTORY.md) for accuracy, including the final fixes and evidence collection. The student confirmed it looked accurate on November 5.
- [x] Capture current table/survey evidence. The student's November 5 [tables and surveys screenshot](evidence/01-database-surveys.png) shows all five required table names and the saved `Survey Test` rows with readable titles and closed status. Some UUIDs/descriptions are visually truncated; use the linked-question evidence to demonstrate relationships.
- [x] Capture current linked-question evidence. The student's November 5 [questions screenshot](evidence/02-database-questions.png) shows the original phone/computer question, its `multiple_choice` type and the `survey_id` reference matching the original survey. UUIDs are partly truncated visually; the full relationship was read in Table Editor. This image does not demonstrate true/false questions; earlier evidence and tests cover that type separately.
- [x] Capture current stored-response evidence. The student's [response screenshot](evidence/03-database-responses.png) clearly shows the read-only query, two distinct response IDs, timestamps, the matching question, and Phone/Computer answers for `Survey Test`. Browser tokens, credentials and account email are excluded. This supplements the older obscured screenshot.
- [x] Capture matching application results. The student's [current results screenshot](evidence/04-app-results.png) shows `Survey Test`, 2 responses, the matching question, chart, Phone 1 / 50% and Computer 1 / 50%. It agrees with the stored-response query. All four current required evidence images are indexed in [the evidence folder](evidence/README.md); older screenshots remain historical.
- [ ] Confirm the final TODO and test records accurately distinguish implemented features from verified behavior and disclose outstanding limitations.
- [ ] Submit the repository URL, deployed app URL, development summary, AI history, and database/results evidence through HuskyCT in the required format. Provide instructor access privately.

## If time allows

- [ ] Run the remaining isolated concurrency, large-data, failure-recovery, and accessibility cases in [Browser Test Cases](BROWSER_TEST_CASES.md); record results and fix reproducible defects.
- [ ] Continue the reviewer experiment. Direct agents reviewed code; the Docker-dependent Gemma worker has not been verified. This is not a required assignment deliverable.

Post-MVP features such as question banks, LMS integration, and AI question generation are not required for this hand-in. Date filtering and CSV survey metadata are open items in the supplied roadmap but are not named in the assignment's core functional requirements.
