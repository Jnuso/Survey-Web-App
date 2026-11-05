# Assignment 15 — Final Submission Checklist

Use this short checklist to prepare the HuskyCT submission. The detailed implementation roadmap is in [TODO.md](../TODO.md), and the precise test history is in [Browser Test Cases](BROWSER_TEST_CASES.md). Check an item only after verifying it.

## Finish verification

- [ ] Sign in to the deployed instructor dashboard and confirm the phone submission appears in the active test survey's results. The student reported seeing the thank-you page; the instructor-side check is still pending.
- [ ] Verify the updated close and delete operations using disposable surveys. On November 5, archive succeeded on a disposable draft, but the close confirmation stalled and the disposable survey remained active.
- [ ] Complete a final smoke test of the public app (a fictional response was submitted and verified in results on November 5): confirm the instructor dashboard works, the active survey and QR link open, and a fictional student response appears in results. Use a fresh browser profile for a new response, and do not expose private information.
- [x] Open the downloaded CSV in a spreadsheet application and verify its columns and answers. Excel displayed separate columns and fictional answers TRUE and Testing on November 5; narrow columns clipped longer values visually, which were verified in the raw CSV.
- [ ] Check the student and instructor pages with keyboard navigation and a second browser; record any limitations. The phone submission and QR opening were reported successful.
- [x] Disclose the unresolved editor navigation and overlapping-save risk and its workaround in the development summary; a version-based fix remains future work.
- [ ] Review the outstanding access-control cases in the detailed test log. Anonymous response reads and survey writes were denied in earlier checks, but not every RLS and non-instructor case has been tested.
- [x] Run the local tests and production build. On November 5, 104 tests passed with one worker and a 20-second timeout; the earlier run timed out and a related test also failed. The latest production build passed with a Vite bundle-size warning. Repeat if code changes before submission.

## Prepare required deliverables

- [x] GitHub repository exists: https://github.com/Jnuso/Survey-Web-App
- [x] Public app URL exists: https://jnuso.github.io/Survey-Web-App/
- [ ] Confirm the latest commit is pushed and the public app is working when the assignment is submitted. Confirm no credentials or secret keys are committed.
- [ ] Arrange a private way for the instructor to test the instructor interface. Do not put passwords in the repository, public screenshots, or chat.
- [ ] Review the [development summary](DEVELOPMENT_SUMMARY.md) and [AI development history](AI_DEVELOPMENT_HISTORY.md); update them for the final work and verify they reflect your experience and understanding.
- [ ] Review and include the database evidence: [tables and surveys](database-surveys-evidence.png), [questions linked to surveys](database-questions-evidence.png), [stored response](database-response-evidence.png), and [application results](results-chart-evidence.png) (plus [results heading](results-evidence.png)). Recapture the response evidence: a pop-up obscures its right-hand columns. The questions and surveys images show the table names and relationships, though some values are truncated. Confirm all images are legible and show no credentials or private student data.
- [ ] Confirm the final TODO and test records accurately distinguish implemented features from verified behavior and disclose outstanding limitations.
- [ ] Submit the repository URL, deployed app URL, development summary, AI history, and database/results evidence through HuskyCT in the required format. Provide instructor access privately.

## If time allows

- [ ] Run the remaining isolated concurrency, large-data, failure-recovery, and accessibility cases in [Browser Test Cases](BROWSER_TEST_CASES.md); record results and fix reproducible defects.
- [ ] Continue the reviewer experiment. Direct agents reviewed code; the Docker-dependent Gemma worker has not been verified. This is not a required assignment deliverable.

Post-MVP features such as question banks, LMS integration, and AI question generation are not required for this hand-in. Date filtering and CSV survey metadata are open items in the supplied roadmap but are not named in the assignment's core functional requirements.
