# Browser Workflow Test Cases

Use the deployed app at https://jnuso.github.io/Survey-Web-App/. These are manual browser tests for the assignment. A pass requires the stated expected result; record the browser, device, date, result, and any issue. Prior observations below are limited to the exact scenario described and do not imply that every step in a test has passed.

## Setup and safety

- Use a clearly labeled `TEST - ...` survey and fictional answers. Never use real student data.
- Use the existing instructor account; do not record credentials in screenshots or logs.
- For student and authorization checks, use a separate private browser session that is not signed in. Each distinct browser profile has its own duplicate-protection token.
- Activating a new survey automatically closes the current active survey. Run lifecycle tests only when the existing active sample can be interrupted. Deleting a survey also deletes its responses; do not delete anyone's work. Keep the labeled sample responses as evidence unless the owner asks to remove them.
- Test desktop and a phone, plus a second browser when available. Do not assume a resized desktop browser is a physical phone.

## Instructor workflows

### B01 — Sign in and protect instructor pages
**Steps:** In a private session, open the dashboard URL; sign in with the instructor account; refresh; then sign out. Try an incorrect password separately.
**Expected:** An unauthenticated visitor is redirected to login; valid credentials open the dashboard and survive refresh; invalid credentials fail without revealing the password; sign-out prevents access to instructor pages.
**Prior evidence:** Instructor sign-in and dashboard loading passed on the deployed site; other steps not yet verified.

### B02 — Create a draft with both question types
**Steps:** Create a `TEST - ...` survey with a title, description, one multiple-choice question with three choices, and one true/false question. Save it, return to the dashboard, and refresh.
**Expected:** The draft and its details persist; the dashboard shows its title, status, and creation date. True/false has the two correct choices.
**Prior evidence:** A single-question multiple-choice draft was created locally and persisted to Supabase; the full scenario is pending.

### B03 — Edit, order, and validation
**Steps:** Open the test draft. Edit its title and question, add and reorder questions and choices, then save and reopen it. Try saving with a blank title, blank question, blank choice, and no questions.
**Expected:** Saved changes and ordering persist. Invalid data cannot be saved; a helpful error appears. Removing an item requires the applicable confirmation and does not remove other items.
**Status:** Not yet tested.

### B04 — Duplicate and search
**Steps:** Duplicate the test survey, inspect its editor, save the copy, search for its title, then filter by Draft and Active.
**Expected:** The copy has its questions and choices, a `Copy of` title, Draft status, and no responses; search and filters show matching surveys only.
**Status:** Not yet tested.

### B05 — Activate and show QR
**Steps:** Activate the test draft, open Present, check the displayed URL and response count, download its QR image, and scan the displayed code with a phone.
**Expected:** The survey becomes Active; the QR and readable URL lead to the same public survey; the response count matches results; the PNG opens. If another survey was active, it becomes Closed.
**Prior evidence:** The existing sample's presentation URL and count were verified in production, and the student confirmed its QR opened on a phone. Download and switching between two surveys remain untested.

### B06 — Close and retain history
**Steps:** While a test survey is open in a separate student session, close it from the instructor presentation page. Refresh the student page and attempt a submission. Open the instructor's results, archive the closed test survey, and reopen its results.
**Expected:** The instructor is asked to confirm closing; students cannot submit once closed; the closed/archived survey and its previous results remain accessible to the instructor.
**Status:** Not yet tested.

### B07 — Delete confirmation
**Steps:** On a disposable draft created for this test, choose Delete and cancel. Verify it remains. Then choose Delete and confirm.
**Expected:** Cancel preserves the draft. Confirm permanently removes only that draft. A survey with responses warns about deletion of its data; do not confirm deletion of evidence or other work.
**Status:** Not yet tested.

## Student and results workflows

### B08 — Public student submission and required answers
**Steps:** Open the active test survey in a fresh private session. Submit without answering, then answer every question and submit. Refresh the page.
**Expected:** Missing answers are rejected without storing a partial response. A complete submission shows confirmation and stays recorded after refresh; no student login is required.
**Prior evidence:** A complete anonymous production submission succeeded. Missing-answer and persistence checks remain pending.

### B09 — Duplicate protection and independent browsers
**Steps:** In the same student profile, reopen the survey, answer, and submit again. Submit from a separate private profile or another device.
**Expected:** The first profile sees a friendly duplicate message; a different browser token can submit once. This prevents accidental repeat submissions but does not establish identity or prevent deliberate bypass.
**Prior evidence:** A repeated submission in the same production browser was rejected; separate-profile UI behavior is pending.

### B10 — Results, refresh, and CSV
**Steps:** Submit known sample answers from separate profiles. Open instructor results, check counts and percentages, submit one more answer, and click Refresh. Export CSV and open it in a spreadsheet application.
**Expected:** Counts and percentages match the known submissions; refresh includes the new response; the CSV has one row per submission with timestamps and matching question/answer columns. Verify commas and quotation marks remain within their cells and formula-like text is treated safely.
**Prior evidence:** The production sample displayed 3 responses, with 2/3 (66.7%) and 1/3 (33.3%); two CSV unit tests passed. A real spreadsheet export and refresh scenario are pending.

### B11 — Closed or invalid link
**Steps:** Open an invalid survey URL, and separately open the URL of a closed test survey.
**Expected:** A clear unavailable/not-accepting-responses message is shown; no response can be submitted. Do not expose raw database errors.
**Status:** Not yet tested.

## Security, accessibility, and device checks

### B12 — Anonymous access restrictions
**Steps:** In a signed-out private browser, open an instructor results URL and dashboard URL. Using the public client, attempt to select `responses` and `answers`, insert a survey, and submit an answer using a choice from another question.
**Expected:** Instructor pages require sign-in; result reads and survey writes are denied; the invalid submission is rejected and no partial response is created.
**Prior evidence:** Public-client reads of responses/answers and direct survey insertion were denied; invalid-choice and browser-route checks are pending. Public client checks require browser developer tools or a separately recorded API test.

### B13 — Keyboard and screen layout
**Steps:** Navigate login, editor, student survey, results, and dialogs using Tab, Shift+Tab, Enter/Space, and radio arrow keys. At 200% zoom and a narrow mobile viewport, inspect page content and focus indicators.
**Expected:** All controls have meaningful labels and visible focus; tasks can be completed by keyboard; content remains readable without horizontal clipping; choices have large touch targets and counts do not rely on color alone.
**Status:** Not yet tested. Automated checks do not replace manual screen-reader verification.

### B14 — Phone and second-browser smoke test
**Steps:** On a phone, scan the QR and submit a fictional response. In a second desktop browser, open the same public link and complete a submission using its own browser token. Verify the additional responses in instructor results.
**Expected:** The survey is usable on both devices, confirms each submission, and the instructor sees both responses after refresh.
**Prior evidence:** Phone QR scan opened the survey; phone submission and second-browser checks are pending.

## Test run record

| Date | Case | Environment | Outcome | Evidence / issue |
| --- | --- | --- | --- | --- |
| 2026-10-30 | B01, B05, B08–B10 | Deployed site; desktop browser; separate API client | Partial pass | See `docs/LEARNING_LOG.md`; only the prior-evidence steps above were checked. |
| 2026-10-30 | B05 / B14 | Physical phone | Partial pass | User reported that the sample QR code opened the survey. |
