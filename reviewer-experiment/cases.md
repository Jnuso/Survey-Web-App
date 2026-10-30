# Reviewer baseline: candidate changes

Review the following four independent, synthetic changes. Each contract is complete for this exercise. Find regressions introduced by the changed code; do not assume unstated requirements. For each concrete finding, identify the case and changed line, an input or sequence, the actual versus required behavior, and a minimal correction. State explicitly when a case has no findings. Review only; do not run code, modify files, use external tools, or invent test results.

## A. TypeScript response accounting
Contract: selectedIndex is either null (no answer) or an integer from 0 to 3 inclusive. Return true for every selected index and false only for null.
```diff
 function hasAnswer(selectedIndex: number | null): boolean {
-  return selectedIndex !== null;
+  return Boolean(selectedIndex);
 }
```

## B. React survey loader
Contract: a mounted Survey component can receive a different surveyId without unmounting. Whenever surveyId changes, fetchSurvey must be called with the new ID. fetchSurvey identity is stable, and asynchronous response ordering is handled inside fetchSurvey.
```diff
 function Survey({ surveyId }: { surveyId: string }) {
   useEffect(() => {
     fetchSurvey(surveyId);
-  }, [surveyId]);
+  }, []);
   return <main>Survey</main>;
 }
```

## C. Database results permission
Contract: anonymous visitors must not be able to read individual submission rows. Instructor-only access to results is required. Both statements run after the table is created, and no other grants or policies exist.
```diff
 ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
-CREATE POLICY instructor_results ON responses FOR SELECT TO authenticated USING (true);
+CREATE POLICY public_results ON responses FOR SELECT TO anon, authenticated USING (true);
 GRANT SELECT ON responses TO anon, authenticated;
```

## D. TypeScript sorting control
Contract: entries have finite timestamps; return a new array sorted from newest to oldest without mutating the original. Stable ordering of equal timestamps is acceptable. Runtime is ES2023.
```diff
 function newestFirst(entries: { time: number }[]) {
-  return [...entries].sort((a, b) => b.time - a.time);
+  return entries.toSorted((a, b) => b.time - a.time);
 }
```
