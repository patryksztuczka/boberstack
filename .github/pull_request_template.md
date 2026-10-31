<!--
Use a Conventional Commit title in plain language, such as
"fix(api): refuse a todo title longer than the column allows". A squash merge puts the title on
master, and the PR title check accepts only the types in scripts/conventional-commit.mjs.
Write every section from the final diff, not from the branch's commit history. Solve one
underlying problem; split independent fixes into their own pull requests.
-->

## Problem

<!-- What is wrong or missing, in a sentence or two, and why it matters. For a bug, include the
expected behavior and how the failure shows up: reproduction steps, the environment, the log line. -->

## Change

<!-- How this solves the problem: the behavior it introduces and the tradeoffs a reviewer should
weigh. If it spans apps, packages or infrastructure, say why each part is needed for the same
problem. Name the ADR it records or follows. List anything that must happen around the merge:
a migration, a secret to set in the Alchemy stack, a deploy step. -->

## Verification

<!-- Evidence, not a claim. Paste each command you ran with the lines of its output that show the
result, and for a UI change the verify-web evidence (screenshot, log excerpt). Write
"inconclusive" next to anything you could not run, and say why. "Tests pass" alone is not evidence,
and pnpm verify does not replace checking the affected behavior. Say whether you ran
pnpm test:integration. Drag screenshots or recordings into this description and never commit them.
Show synthetic data only. Example:

$ pnpm --filter @boberstack/api test
      Tests  6 passed (6)
$ verify-web: added two todos in a row, both listed -> screenshot attached
$ pnpm test:integration: inconclusive, Docker was not running
-->
