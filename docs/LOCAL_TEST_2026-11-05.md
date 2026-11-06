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
