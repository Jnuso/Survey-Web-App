# Local verification — November 5, 2026

Application/source commit: `6f4f0f784664137e7c4054e1b64463dcb0e9c2bf`. Working tree was clean at the start. Existing installed dependencies and ignored local environment configuration were used; this was not a fresh clone/install check. No credentials were printed or copied into the repository.

| Check | Result |
| --- | --- |
| `npm test -- --maxWorkers=1 --testTimeout=20000` | 108 tests passed across 8 files, 63.40 seconds. Component/backend services are mocked; transport tests simulate HTTP. |
| `npm run build` | TypeScript and Vite passed. Existing approximately 903 kB main-bundle warning remains. |
| `npm run dev -- --host 127.0.0.1` | Started successfully at `http://127.0.0.1:5173/`; HTTP 200 and the app root element were verified. |
| `npm run preview -- --host 127.0.0.1 --port 4173` | Started successfully. HTML, production JavaScript and CSS each returned HTTP 200. This is a serving check, not a rendered production-preview workflow. |
| Local signed-out dashboard | Integrated-browser navigation redirected to `#/login` and showed the login screen. |
| Local signed-out results | Integrated-browser navigation to the original survey results redirected to `#/login` and showed the login screen. |
| Current GitHub deployment | [Run 42149146774](https://github.com/Jnuso/Survey-Web-App/actions/runs/42149146774) completed successfully for the source commit above. |

## Pending local browser workflow

The local login page is open with the dedicated test-account email filled in. The user was asked to enter the password directly and sign in, because localhost has a separate browser session from the public site. No local authenticated session was observed at the last check.

After sign-in, verify saving/reopening a clearly labeled fictional draft, activation/presentation, a student submission, duplicate protection and matching results/CSV, then close the test survey. These steps remain pending and are not implied by the successful automated suite, HTTP responses or earlier deployed-site tests. The local frontend connects to the hosted Supabase project; it is not an offline database setup. Production fault injection and actual non-instructor API login remain separate unverified cases.

## Follow-up: live local student workflow

The user authorized taking control. The local login had an empty password field and no saved-login option appeared. Reopening the public app restored the existing dedicated instructor session. Used that public session to activate the fictional `TEST — Instructor access verification` survey (`9fd1fa02-d618-42c5-bab0-10c813d8c1e2`); no other survey was active. Presentation showed its production QR URL and zero responses.

Opened that survey through the local frontend at `http://127.0.0.1:5173/#/s/9fd1fa02-d618-42c5-bab0-10c813d8c1e2`. The true/false question loaded from hosted Supabase without a local instructor session. An unanswered submission showed the required-answer error. Selecting True and submitting displayed the thank-you page. Reloading, selecting False and resubmitting returned the duplicate-response message.

The public instructor results showed exactly 1 response: True 1/100%, False 0/0%. Reloading retained those results. The downloaded CSV was parsed independently: exactly one response row, a nonempty response ID and True for the matching question. A copy is retained at `docs/evidence/local-student-flow.csv`.

The presentation Close click initially timed out in the browser automation, and the dialog API did not expose a confirmation. Later the public dashboard showed the survey closed. A test-ID-scoped SQL cleanup (`update ... where status = 'active' returning ...`) returned zero rows, so it made no further status change. Reloading the local student URL showed Survey unavailable, and the closed survey's instructor results still showed the single True response. This verifies the final closed state and retained history, not uninterrupted automated confirmation handling.

The user reported signing in locally, but the local tab visible to the assistant still showed the login page; the accessible authenticated session was on the public origin. Therefore this is a **hybrid local-student/public-instructor integration pass**, not a complete local instructor CRUD pass. The local authenticated instructor workflow, a fresh clone/install, live delay/error injection and actual non-instructor API login remain unverified. No password was read or extracted.

## Student follow-up

After the remaining local instructor check was identified, the student reported completing the local test. Recorded it as a student-reported manual pass; there was no additional assistant browser observation. The earlier assistant-run scope above remains unchanged. A fresh clone/install, live fault injection, actual non-instructor API login and broader concurrency/accessibility checks remain unverified.
