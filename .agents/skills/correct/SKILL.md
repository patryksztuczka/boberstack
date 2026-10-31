---
name: correct
description: Turn a correction into a check that runs on every change. Use when the user corrects an agent for something an agent has been corrected for before, says "again", "znowu", "how many times", types /correct, or when a review finds a mistake that a rule in AGENTS.md or CODING_STANDARDS.md already forbids.
---

# Correct

A correction given in chat lasts one session. This skill moves it to the strongest place that can hold it, so the next agent cannot make the same mistake.

## 1. Name the rule

Write the rule as one sentence a reviewer could check against a diff: "Time comes from `Clock`, never from `new Date()`." Find the commit, diff or message where the mistake happened and keep it: it becomes the test case.

## 2. Pick the strongest enforcer that can hold it

Go down this list and stop at the first that can express the rule:

1. **A type or the code itself.** A branded id, a `Schema`, a service that is the only way to reach a resource, a deleted export. The wrong code no longer compiles.
2. **An Effect diagnostic.** `@effect/tsgo` already knows a rule (see `diagnosticSeverity` in `tsconfig.base.json` and the list in `node_modules/@effect/tsgo/README.md`). Raise it to `error`.
3. **A lint rule.** A built-in oxlint rule, or a new rule in `tools/oxlint/<plugin>/rules/` with a `RuleTester` test. The message says what to do instead and links the reference that explains why.
4. **A test or a script.** A Vitest test, a `scripts/*.mjs` check wired into `pnpm verify` and CI, or a Git or Claude Code hook.
5. **A skill.** Steps that need judgement, such as how to drive the app or how to review.
6. **A sentence in AGENTS.md or a reference.** Only when nothing above can express it. Keep it to one line.

Changing the lint config, `tsconfig.base.json`, hooks or CI needs owner sign-off (AGENTS.md). Propose the change with the evidence from step 3 and wait.

## 3. Prove the enforcer catches the real mistake

Reproduce the original mistake against the new check and paste the failing output. A rule that has never failed has not been tested. For a lint rule, the original code goes in the rule's `invalid` cases; for a script, paste its output on the original code.

Then fix every existing violation in the repo, so the check lands green.

## Report

End with the rule, the enforcer, the failing output from step 3 and the files changed. Do not say the correction is fixed without that output.
