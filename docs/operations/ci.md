# CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. When a change touches only documentation, the jobs are skipped. Each stage needs the one before it, so a cheap failure stops the expensive ones:

1. Static checks: format and lint, the environment schema, exact dependency versions and pinned actions, versions named in the docs, unused code (knip), and the suppression count, which reports but never fails.
2. Typecheck.
3. Unit tests, only for the packages a change touches and their dependents. The stage fails if a changed package was not selected, so it cannot pass by testing nothing.
4. Build.
5. Integration: the Testcontainers Postgres suites.

The `CI OK` job fails when any stage failed or was cancelled and passes when they passed or were skipped, so it is the one check to require on `main`.

`.github/workflows/pr-title.yml` checks that the pull request title is a Conventional Commit subject. On a branch, a newer run cancels the older one. On `main`, every run finishes.

`pnpm verify` runs stages 1 to 4 locally, and the pre-push hook runs it. `pnpm test:integration` runs stage 5 and needs Docker.
