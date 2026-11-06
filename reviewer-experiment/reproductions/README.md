# November 5 audit reproductions

Historical fixture: the two defects were subsequently fixed. The current acceptance tests live in `src/student.test.tsx` and `src/present.test.tsx`; they passed as part of the 108-test suite. The defect assertions below are expected to fail against the corrected app. Replay them only with the original audited application revision.

`ui-races.case.tsx` demonstrates two defects at application commit `087baec16e11ae5467691c5bb41389ca92a2150e` using jsdom, the real React components, a delayed mocked submission, and a failing mocked response-count request. It does not use the public app, credentials, or the live database.

The two cases passed on November 5 in 4.83 seconds. Here “passed” means the asserted defective behavior was reproduced, not that the application behaved correctly. This file intentionally uses `.case.tsx` so the normal acceptance suite does not assert that defects must remain. When fixing the app, add acceptance tests for the desired behavior to the existing student/presentation test files instead.

With the original audited application source available, run the cases from its repository root using a temporary test copy:

```powershell
Copy-Item -LiteralPath 'reviewer-experiment/reproductions/ui-races.case.tsx' -Destination 'reviewer-experiment/reproductions/ui-races.audit.test.tsx'
try {
    npx vitest run reviewer-experiment/reproductions/ui-races.audit.test.tsx --maxWorkers=1 --testTimeout=20000
} finally {
    Remove-Item -LiteralPath 'reviewer-experiment/reproductions/ui-races.audit.test.tsx'
}
```

The temporary test was removed after the audit. No application code was changed. The normal 104-test suite passed separately before these cases were added.
