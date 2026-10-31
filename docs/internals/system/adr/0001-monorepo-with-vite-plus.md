# One pnpm monorepo, driven by Vite+

**Status:** accepted, 2026-10-30.

The api, the web app, the CLI, the infrastructure and the shared contract change together: a new endpoint touches `packages/domain`, a handler in `apps/api` and a hook in `apps/web` in one pull request. They live in one pnpm workspace so that change is one commit, one review and one CI run, and the contract is imported, never published.

Vite+ (`vp`) is the one toolchain: dev server, build, Vitest, oxlint, oxfmt, the task runner with its cache, and the Git hooks. Turborepo, ESLint, Prettier and Husky would each add a config and a version to keep in step with the others, and the root `vite.config.ts` holds what they would have spread over five files.

## Consequences

- All lint config lives in the root `vite.config.ts`; Vite+ ignores nested lint configs.
- `pnpm verify` is the same sequence CI runs, so a green pre-push means a green pipeline, apart from integration tests.
- Vite+ is young. Its pin moves only with owner sign-off, and a regression is worked around with a `VENDOR:` comment, not by adding a second tool.

## Considered options

- Turborepo on top of Vite+: two task runners with two caches for the same graph.
- Separate repositories per app: the contract would need publishing and versioning, and a cross-cutting change would need several coordinated pull requests.
