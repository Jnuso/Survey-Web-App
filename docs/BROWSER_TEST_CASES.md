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

## Edge cases and failure recovery

These cases are **not yet tested** unless an explicit prior observation is stated. Use a dedicated disposable test project for bulk, concurrency, malformed-payload, and fault-injection tests. Do not add hundreds of records to the assignment's existing evidence survey or simulate failures on a real class survey. Database/API checks supplement the browser checks; they are not claims that a browser alone can create the required conditions.

### E01 — Empty and single-response results
**Steps:** Open results for a newly activated test survey with zero responses, export its CSV, then submit exactly one answer and refresh results.
**Expected:** Zero responses shows the empty state and no division-by-zero or invalid percentage. The CSV contains the header and no response rows. After submission, the count is 1, the chosen answer is 100%, and the others are 0%.

### E02 — Snapshot with more than 500 responses
**Steps:** In an isolated test project, seed 601 uniquely identifiable fictional responses and corresponding answers to a dedicated survey. Open its results and export CSV; independently query the database for count and unique response IDs, and compare with the CSV rows.
**Expected:** Results show 601 responses; the CSV contains exactly 601 distinct response IDs with the correct answers and no omissions or duplicates. A rollback-only SQL test previously verified the database snapshot function with 601 responses; the browser and CSV portions remain untested.

### E03 — Submissions concurrent with a snapshot
**Steps:** In an isolated test project, seed more than 500 uniquely identifiable responses. Use two database sessions and synchronization barriers: begin one response transaction without committing it; start an instructor snapshot request, commit the response while the request is in progress, and record the IDs returned. Repeat with the commit completed before the snapshot begins and with it occurring after. Compare every snapshot's response IDs against the database visibility at that snapshot boundary; separately compare the displayed counts and exported CSV from the same loaded snapshot.
**Expected:** Each snapshot is internally consistent: each visible response and its answers occur once; the uncommitted/later response may be absent, while a response committed before the snapshot starts is present. The UI and CSV agree for the same load. Refresh after all commits to verify the final count. Record synchronization evidence rather than inferring a race from timing alone.

### E04 — Partial or mismatched submissions
**Steps:** In a signed-out test client, submit empty answers, duplicate question IDs, an unknown question ID, a choice from a different question, malformed IDs, and an answer from a different survey. Recheck the response count after each attempt.
**Expected:** Every invalid payload is rejected and creates neither a response nor partial answers. The browser shows a useful error without exposing internal database details. Test RPC payload manipulation separately from ordinary UI behavior.

### E05 — Simultaneous duplicates and double-click
**Steps:** On a disposable active survey, issue two submissions with the same browser token at nearly the same time; separately double-click Submit in the browser. Then retry with a different token.
**Expected:** At most one response is saved for the original token; the UI prevents repeated clicks while submitting and shows a friendly duplicate message if needed. The different token can submit once. Check database records as well as the visible message.

### E06 — Close or switch during submission
**Steps:** Open a disposable active survey in a student session. While holding a submission request at a controlled barrier, close the survey or activate another test survey, then release the request. Repeat with the submission committed before closing and with closing completed first.
**Expected:** A submission that commits before closing may succeed; once closing has completed, a new submission is rejected. Each response is complete or absent, with no orphaned answers. Opening the previous survey afterward reports it is unavailable. Record actual ordering and results.

### E07 — Route changes and stale asynchronous work
**Steps:** In one browser tab, select an answer on survey A, then navigate to survey B; repeat after completing survey A. Also delay A's request so it finishes after navigating to B.
**Expected:** B starts with its own empty answers and form; A's answers, success state, and late response do not replace B's state. The local invalid-link-and-back check passed earlier; a two-survey and delayed-request test remains pending.

### E08 — Question-type changes and cancellation
**Steps:** Enter multiple-choice text, switch to true/false, and cancel the warning. Repeat and confirm. Add a third nonempty choice, cancel its removal, then confirm removal. Save and reopen.
**Expected:** Cancel retains the original choices and type. Confirmed type changes/removal discard only the content identified in the warning; the final saved state persists. No other question or answer changes.

### E09 — Temporary network failures
**Steps:** On a test survey's presentation page, block a poll request, restore connectivity, and wait for the next refresh. Repeat on results by forcing Refresh to fail and then to succeed. Simulate a slow presentation request lasting longer than its refresh interval.
**Expected:** A useful error appears; after recovery, the QR, link, count, and controls return, and the results error clears. Slow requests do not cause every refresh to be discarded. Confirm with browser network controls and record the request outcomes.

### E10 — Browser storage unavailable
**Steps:** In a disposable browser profile, block or force errors from local storage, open a test survey, and attempt to submit. Restore storage and retry.
**Expected:** The button is re-enabled and a helpful storage message is shown without claiming the response was submitted. After storage is restored, a valid response can be submitted once. Do not silently disable duplicate protection.

### E11 — CSV special characters and missing answers
**Steps:** In a disposable survey, include a comma, quote, line break, Unicode, and spreadsheet-formula-like prefix in question or choice text. Where possible, use a controlled historical fixture with a missing answer. Export and open the file in a spreadsheet application.
**Expected:** Rows and columns stay aligned, quotes and line breaks survive, Unicode is readable, formula-like content is treated as text, and a missing answer is represented as an empty cell. Never execute an exported formula to test safety.

### E12 — Authorization and missing resources
**Steps:** From an anonymous client and an authenticated account that is not on the instructor allowlist, call the results snapshot function for an existing test survey. As an enrolled instructor, request a nonexistent survey ID. Also open a protected route while signed out.
**Expected:** Anonymous and non-instructor users receive no response or answer data; the nonexistent ID produces a controlled error; protected pages require sign-in. Check API responses as well as browser display and avoid recording credentials or tokens.

### E13 — Refresh, reload, and export consistency
**Steps:** Load instructor results for a disposable survey, add a new test response in another profile, export without refreshing, then refresh and export again. Reload the results page and compare counts with the database.
**Expected:** The first export matches the snapshot already displayed, even if it does not include the later response. Refresh obtains a new consistent snapshot; the second export and displayed counts agree and include the committed response. A reload preserves correct results.

### E14 — Keyboard, narrow screens, and long content
**Steps:** Use a phone and desktop at 200% zoom with long question/choice text, several options, a long URL, and only keyboard navigation. Test focus and browser back/forward navigation.
**Expected:** Text and controls remain visible and usable without unintended clipping; focus remains identifiable; radio choices and submit work; navigation does not silently submit. Document actual screen-reader behavior separately.

### E15 — Large snapshot limits
**Steps:** In an isolated test project only, gradually increase synthetic response volume beyond the expected class size while recording request time, response size, browser behavior, and errors. Stay within free-tier limits and stop on service degradation.
**Expected:** Within the tested size, results and export remain correct and responsive. If a service, memory, or response-size limit is reached, the app reports failure rather than presenting a truncated result as complete. Record the measured limit; do not infer an unlimited capacity.

## Test run record

| Date | Case | Environment | Outcome | Evidence / issue |
| --- | --- | --- | --- | --- |
| 2026-10-30 | B01, B05, B08–B10 | Deployed site; desktop browser; separate API client | Partial pass | See `docs/LEARNING_LOG.md`; only the prior-evidence steps above were checked. |
| 2026-10-30 | B05 / B14 | Physical phone | Partial pass | User reported that the sample QR code opened the survey. |


| 2026-10-31 | Browser suite | Internal browser | Blocked | Local browser use disabled in Work settings; no browser cases were run. Five CSV unit tests passed, including edge cases and 601 synthetic export rows. |
