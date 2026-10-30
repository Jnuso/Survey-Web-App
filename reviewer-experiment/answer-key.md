# Scoring key — do not send to reviewers

- A: Defect. `hasAnswer(0)` returns false instead of true. Restore explicit `selectedIndex !== null`. One finding maximum.
- B: Defect. If the mounted component changes ID from `a` to `b`, the effect is not rerun, so `fetchSurvey('b')` is never called. Include `surveyId` in the dependency array. One finding maximum.
- C: Defect. The policy permits anonymous SELECT of all rows when paired with the existing GRANT, exposing individual responses. Restrict SELECT policy to authenticated instructors. One finding maximum. Note that authenticated policy assumes registration is restricted to authorized instructors.
- D: Control, no defect. `toSorted` is available by contract and returns a sorted copy without mutating `entries`.

Score each of A–C as detected only when its stated counterexample or equivalent and actual versus expected behavior are correct. Record true positives, missed seeded defects, additional unsupported findings, findings on D, exact locations, elapsed time, call count, worker status, and actual test evidence. Do not use model agreement as proof. This is a tiny teaching exercise, not a statistically reliable benchmark.
