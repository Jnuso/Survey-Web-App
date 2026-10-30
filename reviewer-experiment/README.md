# Independent reviewer experiment

This is a bounded evaluation of the existing coding-agents review worker, inspired by NVIDIA AICR's independent and adversarial review stages. It does not claim to reproduce NVIDIA's Claude-specific workflow. Link: https://github.com/NVIDIA/aicr/blob/main/.agents/skills/aicr-cross-review/SKILL.md

## What we know

- The configured coding-agents MCP exposes a review profile with isolated project snapshots and Docker Linux execution. Its test environment is Python/pytest-oriented, so a completed review is not evidence of TypeScript, React, SQL, browser, or database tests passing.
- A prior synthetic TypeScript experiment detected one seeded issue, with an off-by-one line citation; this does not establish full React review ability. See `Assignment 12/experiments/gemma-typescript-review/README.md`.
- On the initial check for this project, Docker CLI was installed, but the Linux engine was unreachable. A live baseline has not run. No model-call quota has been consumed for this experiment.

## Safe baseline procedure

1. Start Docker Desktop with its Linux engine. Confirm `docker info --format '{{.OSType}}'` returns `linux`; never substitute host execution.
2. Start one `coding-agents` review job with `project_path` omitted, `max_calls: 1`, and the exact text of `cases.md` as its assignment. The empty project is essential: do not provide this folder as the project, since it contains the scoring key. Send only synthetic material and no credentials.
3. Retrieve the unedited response and actual job status/results. Record the model, timestamp, elapsed time, job ID, call count, status, and any pytest result. An empty-project pytest collecting zero tests is not application verification.
4. Only after recording the response, compare it to `answer-key.md`. Record all scores, false positives, unsupported claims, and inaccurate citations. Independently check each claim against the fixture contract. Leave failures and unavailable evidence visible.
5. For an improved-prompt comparison, start a fresh job with the same isolated inputs and this appended instruction: `For every finding provide a concrete reproduction, observed behavior, required behavior, and a specific changed line. Consider each case independently. If uncertain, say so rather than inventing context.` Record the prompt difference, model, configuration, and scores; paired cases are only an exploratory comparison. Respect configured provider pacing and quotas.
6. For future application reviews, give reviewers the same fixed snapshot and requirements, keep initial findings independent, then challenge claims using source inspection and relevant tests. Never interpret reviewer agreement as a substitute for executable checks.

## Baseline results

Not run: the local Docker Linux engine was unavailable on initial inspection. No scores or reviewer conclusions are available yet. Update this section only with actual evidence.

## Direct-agent baseline — October 30, 2026

A direct review agent received only `cases.md` and no answer key. It independently identified cases A, B, and C with the expected counterexamples and reported no finding for D. Score: 3/3 seeded defects, 0 findings on the control, 0 unsupported findings. No executable tests were run; exact duration and token usage were not captured. This result is not a custom Gemma-worker result, a comparison between models, or an estimate of real-world review accuracy.

## Prompt-comparison limitation

A second agent was asked to review the same cases with more explicit reproduction and evidence requirements. It inherited the earlier review context, so its matching findings are not an independent or blind comparison and are not scored. A valid future comparison needs fresh agents with no prior findings or answer key in their context. The custom Gemma worker remains untested in this project.
