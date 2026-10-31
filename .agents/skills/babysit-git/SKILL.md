---
name: babysit-git
description: Always use this skill before interacting with Git in any way, including inspecting changes, creating commits or branches, switching branches, merging, rebasing, tagging, pushing, or rewriting history.
---

# Babysit Git

## Commits

Write a short Conventional Commit subject that tells a human what changes and why, including the intent without ticket numbers or internal shorthand. The type is one of `CONVENTIONAL_TYPES` in [`scripts/conventional-commit.mjs`](../../../scripts/conventional-commit.mjs); the `commit-msg` hook refuses any other.

Bad: feat: todos v2 — toggle / delete / sort (ticket 04) - #28
Good: feat: let a user mark a todo as done from the list

Do not add `Co-Authored-By` or other AI attribution trailers to commit messages.

Stage only the files the task changed. Inspect `git status` before staging.

## Hooks

`pre-commit` runs `vp staged`, `commit-msg` checks the subject, and `pre-push` runs `pnpm verify`. Never bypass them: no `--no-verify`, no `-n` on `git commit`, no `HUSKY=0` or `VP_GIT_HOOKS=0`, no `-c core.hooksPath=…`. `.claude/hooks/block-no-verify.mjs` blocks these. A failing hook is work: fix the cause and commit again.

## Branches

Start every branch name with one of these prefixes:

- `feat/`
- `bugfix/`
- `refactor/`
- `chore/`
- `hotfix/`

## Never without the user asking

Force-push, rewrite published history, delete a branch you did not create, or push to `master`.
