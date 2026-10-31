---
name: file-pr
description: Always use this skill before creating or updating a pull request. It governs PR titles, descriptions, branch preparation, commits intended for a PR, and watching the PR until its checks are green and its review threads are answered.
---

# File a pull request

## Before you open it

Run `pnpm verify`. It runs the same steps as CI, and the pre-push hook runs it again. Never pass `--no-verify`; a Claude Code hook blocks it. If a hook fails, fix the cause.

Branch and commit rules are in the `babysit-git` skill.

## Title

The title is a Conventional Commit subject: `<type>(<optional-scope>): <what changes and why>`, for example `fix(api): refuse a todo title longer than the column allows`. The type is one of `CONVENTIONAL_TYPES` in [`scripts/conventional-commit.mjs`](../../../scripts/conventional-commit.mjs), and the scope is lower-case words joined by hyphens. A squash merge puts the title on `master`, and the PR title workflow checks it against the same list.

Write the title from the final diff, the way a commit subject tells a human what changes and why.

## Description

The description follows [`.github/pull_request_template.md`](../../../.github/pull_request_template.md): its Problem, Change and Verification sections, in that order. The comment under each heading says what the section holds. Write each section to that brief from the final diff, then delete the comments.

Screenshots and recordings go into the description by dragging them into the GitHub editor. Never commit them. Show development screens with synthetic data only.

Leave `Co-Authored-By` trailers and other AI attribution footers out of the title and description.

## Watch

After you open or update a pull request, watch it until every check is green and no review thread is waiting on you. When the harness offers a pull request watch, use it and end the turn; otherwise follow the checks with `gh pr checks --watch`.

- A failing check: read its log, fix the cause on the branch and push. A failure the diff did not cause is rerun once and reported to the user.
- A review comment: fix what it asks, or answer it in its thread when you disagree or need a decision.

Update the title and description whenever a fix changes what the pull request does.
