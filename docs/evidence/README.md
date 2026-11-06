# Current submission screenshots

Collected with the student's manual workflow on November 5, 2026 (America/New_York). All images are saved unchanged from the student-supplied screenshots and were visually checked for readable evidence and exposed credentials/account details.

1. [Database tables and saved surveys](01-database-surveys.png): shows the five required table names, saved Survey Test rows and closed status.
2. [Questions linked to surveys](02-database-questions.png): shows the phone/computer question, multiple-choice type and survey reference. UUIDs are partly truncated visually; the full matching relationship was read in Table Editor. This image shows multiple-choice data, with earlier true/false evidence retained elsewhere in docs.
3. [Stored fictional submissions](03-database-responses.png): shows the read-only join query and two distinct responses, timestamps, matching question and Phone/Computer answers. The [query source](stored-responses.sql) excludes browser tokens and credentials. Timestamps in the database view are UTC.
4. [Matching app results](04-app-results.png): shows Survey Test, 2 responses, the question/chart and one response per choice at 50% each.

The original phone/computer survey ID is `47bf2335-910a-434d-b521-ecd3caf81da4`. The second similarly named survey is the keyboard test copy. These images show fictional test data and agree with the original survey's stored responses. They are evidence of the demonstrated workflow, not exhaustive security, accessibility or concurrency testing. See the final submission checklist for remaining work. Older screenshots in docs are retained as historical evidence.
