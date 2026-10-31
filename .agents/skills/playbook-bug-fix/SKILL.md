---
name: playbook-bug-fix
description: Fix a defect from evidence. Reproduce it on the surface where it shows, find the cause by eliminating hypotheses, make the smallest fix the evidence justifies, verify on the same surface and land the failing test before the fix. Use when the user reports a bug, a regression, wrong behaviour, an error, or asks to "repro and fix".
---

# Bug fix

You own the fix: the plan, the review and the proof. Every line you ship traces to evidence from running code. A change that "might help" is a hypothesis, not a fix, and it does not ship. When evidence refutes a hypothesis, revert what it motivated.

Open a todo list with the six steps.

## 1. Reproduce it yourself

Reproduce on the surface where the bug shows:

- the web app: the `verify-web` skill (`pnpm dev`, `pnpm dev:doctor`, then drive the browser);
- the api: a request to the URL in `.dev/state.json`;
- the CLI: `pnpm cli <command>`;
- SQL or a store: an integration test on Postgres (`pnpm test:integration`).

Ask the user to reproduce only after you drove the surface as far as it goes, and say exactly what you could not reach. If it does not fire, tighten the conditions, synthesise the trigger or add logging until it does. No repro, no fix.

## 2. Find the cause by elimination

List the candidate causes. Seed the list from the code (spawn read-only Explore subagents for a cause that could sit in several modules) and from history (`git log -L`, `git blame`, `gh pr view` on the commits that last touched the path, the context's ADRs). Then, each round, run the check that rules out the most candidates at once and read the result. When the program's state is unclear, add a log field or read the row; do not guess.

Confirm the surviving mechanism with evidence before you plan the fix. Follow the `principle-fix-root-causes` skill. After two failed fixes on one assumption, use the `principle-attack-the-premise` skill.

## 3. Plan the fix

The smallest change at the root cause. If it crosses a function or module boundary, run the `architect` skill first. For a fix larger than a few lines, hand the implementation to a subagent with the exact scope (files, the cause, the repro command) and review its diff yourself.

## 4. Verify on the same surface

The original repro now passes, on the same surface it failed on. A unit test proves a branch, not that the bug is gone. "Inconclusive" or a different surface is not a pass; say so.

## 5. Order the history

When the bug has a cheap local test path, the failing test lands in a commit before the fix (the `principle-sequence-verifiable-units` skill). When the only test would be slow, flaky or mostly mocks, skip it and keep the repro command instead (the `principle-test-behavior-not-implementation` skill).

## 6. Open the pull request

The `file-pr` skill.

**Reply:** what was broken, the root cause, the fix, and how you verified it, with the failing and then passing repro output pasted verbatim.
