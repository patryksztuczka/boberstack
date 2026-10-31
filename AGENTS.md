# Agent instructions

This file is the repo law for agents and contributors: what the project is for, the pins, the commands, where code goes, and when to stop and ask. How code is written is in [CODING_STANDARDS.md](CODING_STANDARDS.md). All documentation is indexed in [docs/README.md](docs/README.md).

## Project thesis

`boberstack` is a starting point for a TypeScript product built on Effect v4 end to end: an api on Cloudflare Workers, a React SPA served by the same Worker, a Node CLI, and Postgres on Neon, deployed as one Alchemy stack. The todos and sign-in examples are there to be replaced.

It optimises for a codebase an agent can extend without making it worse. Every rule that can be a lint rule, a type or a hook is one, so a mistake fails `pnpm verify` instead of waiting for a reviewer. Rules that cannot be checked live in one place each and are short.

When a project starts from this template, rewrite this section and the [Architecture](#architecture) section on day one. `pnpm init:project` renames the packages, not the prose.

## General rules

- Read [CONTEXT-MAP.md](CONTEXT-MAP.md) and the context's `GLOSSARY.md` before naming anything. Code uses the glossary's words.
- Anything that needs a store, the database, the network or secure randomness is an Effect service; a module-level function is pure.
- Before writing or reviewing Effect code, load the `effect-v4` skill. Before using an Effect, Alchemy or better-auth API you have not seen in this repo, read it at the pinned version: `pnpm sources:fetch` clones the tagged sources into `.repos/` (gitignored). Do not invent APIs.
- SQL lives only in `apps/api/src/platform/database/`, and a store is tested on real Postgres, never with an in-memory fake (root ADR 0004).
- No prose comments in code. A workaround for someone else's bug keeps a `VENDOR:` comment (root ADR 0005).
- Add a lint rule before cleaning up a pattern by hand, so it cannot come back. When you are corrected for the same thing twice, use the `correct` skill.
- A new version replaces the old one in the same change: no `V2`, no re-export kept for compatibility (the `no-shims` skill).
- Before Git: the `babysit-git` skill. Before a pull request: the `file-pr` skill. For prose: the `unslop` skill. To see a UI change working: the `verify-web` skill.

## Pins

Every dependency is an exact version; `pnpm check:deps` fails on `^` or `~`. Versions shared by several packages live in `catalog:` in `pnpm-workspace.yaml`. `minimumReleaseAge: 1440` keeps a release out for a day after it is published.

| Tool                                                                  | Version       | Why pinned here                                                                                                                |
| --------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Node                                                                  | 26.13.0       | Active LTS; `.node-version`, `engines`                                                                                         |
| pnpm                                                                  | 11.28.9       | `packageManager`; do not install with npm or Bun                                                                               |
| Vite+ (`vp`)                                                          | 1.4.0         | dev, build, test, lint, fmt, task runner and Git hooks; `vite` is overridden to its core                                       |
| TypeScript                                                            | 7.0.2         | native compiler                                                                                                                |
| `@effect/tsgo`                                                        | 0.63.0        | Effect diagnostics in `pnpm typecheck`                                                                                         |
| `effect`, `@effect/platform-node`, `@effect/sql-pg`, `@effect/vitest` | 4.0.7         | 4.1.0 removed `effect/Crypto`, which Alchemy 2.0.0-beta.84 imports, and breaks `alchemy dev`. Bump Effect and Alchemy together |
| Vitest                                                                | 5.0.5         | overridden so `@effect/vitest` and Vite+ share one copy                                                                        |
| `alchemy`, `@alchemy.run/*`                                           | 2.0.0-beta.84 | infrastructure as Effects; beta, so read its source before using a resource                                                    |
| `better-auth`                                                         | 1.7.14        | sign-in, through `@alchemy.run/better-auth`                                                                                    |
| React, React DOM                                                      | 19.3.1        |                                                                                                                                |

## Commands

| Command                                               | Does                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                                        | installs; `prepare` runs `vp config`, which installs the Git hooks                                                                               |
| `pnpm db:up`                                          | starts local Postgres in Docker                                                                                                                  |
| `pnpm dev`                                            | local Postgres, `alchemy dev` for the api Worker, and `vp dev` for the web app with `/api` proxied to the Worker. Ports are per checkout (below) |
| `pnpm check`                                          | `vp check`: oxfmt and oxlint, type-aware                                                                                                         |
| `pnpm typecheck`                                      | TypeScript 7 with Effect diagnostics                                                                                                             |
| `pnpm test`                                           | unit tests in every package                                                                                                                      |
| `pnpm test:integration`                               | Testcontainers suites; needs Docker                                                                                                              |
| `pnpm build`                                          | builds every package                                                                                                                             |
| `pnpm verify`                                         | check, typecheck, test and build: the same steps as CI. The pre-push hook runs it                                                                |
| `pnpm check:deps`                                     | fails on a dependency that is not an exact version                                                                                               |
| `pnpm check:doc-pins`                                 | fails when a document names a version the workspace does not install                                                                             |
| `pnpm check:knip`                                     | fails on unused files, exports and dependencies                                                                                                  |
| `pnpm check:suppressions`                             | counts lint and type-check suppressions against `suppressions.baseline.json`; reports growth, never fails                                        |
| `pnpm check:changed`                                  | format, lint, typecheck and unit tests for the files changed since `main`                                                                        |
| `pnpm dev:doctor`                                     | checks the running dev stack and Mailpit, and creates and verifies the demo user `demo@example.com` / `demo12345` through the mail               |
| `pnpm dev:status`, `pnpm dev:stop`, `pnpm db:down`    | show or stop the dev stack of this checkout; `db:down` also stops its Postgres                                                                   |
| `pnpm cli <command>`                                  | runs `apps/cli` (`db migrate`, `openapi`, `health`) against this checkout's database and api                                                     |
| `pnpm sources:fetch`                                  | clones the pinned sources of Effect, Alchemy and better-auth into `.repos/`                                                                      |
| `pnpm run deploy`                                     | `alchemy deploy` of `apps/infra/alchemy.run.ts`. Plain `pnpm deploy` is pnpm's own command                                                       |
| `pnpm init:project -- --name <name> --scope <@scope>` | renames the project, the package scope and the service-id prefix                                                                                 |

`pnpm dev` derives its ports from a hash of the checkout path, so worktrees run side by side; each also gets its own Compose project, database and Mailpit inbox (local mail, root ADR 0008). `node scripts/dev.mjs ports` prints them, `.dev/state.json` holds the running URLs and pids, `.dev/logs/` the logs, and `DEV_WEB_PORT`, `DEV_API_PORT`, `DEV_POSTGRES_PORT` and `DEV_MAILPIT_PORT` override them.

Build the change first, then check it once at the end: `pnpm check:changed` for what you touched, then `pnpm verify`, plus `pnpm test:integration` when you touched SQL, migrations, auth or an endpoint, plus the `verify-web` skill when you touched the UI.

Git hooks come from Vite+: `pre-commit` runs `vp staged`, `commit-msg` checks the Conventional Commit subject, `pre-push` runs `pnpm verify`.

## Layout

```
apps/
  api/      Cloudflare Worker: Effect HttpApi + RPC + better-auth; serves apps/web/dist as static assets
    migrations/      NNNN_name.sql for app and better-auth tables (root ADR 0006)
    src/worker.ts    entry point and composition root
    src/app.layer.ts composition root layer
    src/http/, src/rpc/        handlers per group
    src/modules/<context>/     bounded contexts: ports, services, pure functions
    src/platform/<capability>/ adapters; database/ holds all SQL
    src/testing/               Testcontainers Postgres
  web/      React 19 SPA: React Router, TanStack Query, React Hook Form, Tailwind 4, Paraglide messages (en)
    src/assets/      the beaver: beaver.svg (source), beaver.png, beaver-animated.svg (README), favicon.svg (head; the icons in public/ come from it), not-found.png (map sticker), app-error.png (leaking dam sticker)
  cli/      Effect CLI on Node: db migrate, openapi, health
  infra/    Alchemy stack: Neon, Hyperdrive, the api Worker
packages/
  domain/   the contract: Schemas, branded ids, wire errors, HttpApi, RpcGroups, auth middleware tags
  ui/       shadcn components
tools/oxlint/   lint config and plugins
  boberstack/   ours, rules named @boberstack/<plugin>/<rule>: effect, frontend, no-comments, suppressions, test-hygiene
  anti-slop/    vendored from dmmulroy/anti-slop (MIT), rules named anti-slop/<rule>
docs/           glossaries and ADRs per context (docs/README.md)
scripts/        repo checks, init, changed packages, dev launcher, sources:fetch
.agents/skills/ agent skills; .claude/skills links to them
```

## Where things go

| You are adding                        | It goes in                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| a record, id or error the client sees | `packages/domain/src/<context>/`                                                                                          |
| an endpoint or an RPC                 | the contract in `packages/domain/src/<context>/*.http-api.ts` / `*.rpc.ts`, the handler in `apps/api/src/http/` / `rpc/`  |
| business logic                        | `apps/api/src/modules/<context>/x.service.ts`                                                                             |
| a query or a table                    | a store port in the module, SQL in `apps/api/src/platform/database/x.repository.ts`, a new file in `apps/api/migrations/` |
| a call to another system              | a port in the module, an adapter in `apps/api/src/platform/<capability>/`                                                 |
| an email                              | a template in `apps/api/src/modules/mail/templates/`, sent through the `Mailer` port (root ADR 0008)                      |
| an env var or secret                  | a `layerConfig` in `platform/`, the value in `apps/infra/alchemy.run.ts`                                                  |
| a screen                              | `apps/web/src/features/<name>/`; what other features may use is exported from its `index.ts`                              |
| a UI primitive                        | `packages/ui`                                                                                                             |
| a bounded context                     | `CONTEXT-MAP.md`, `docs/internals/<context>/GLOSSARY.md`, then code (the `domain-modeling` skill)                         |
| a decision worth remembering          | an ADR (the `domain-modeling` skill)                                                                                      |

## Architecture

- Dependency direction: `apps/*` → `packages/domain` → `effect`. Packages never import apps; apps never import each other's `src/`.
- One Worker, one origin: the api Worker serves the built SPA with SPA fallback, and `/api/*` reaches the Worker first. In dev, `vp dev` proxies `/api` to the local Worker.
- HttpApi and RPC are two transports over one contract in `packages/domain` (root ADR 0007). Both run in the same Worker behind the same auth middleware; the OpenAPI document comes from the HttpApi.
- Identity owns users and sessions through better-auth; Todos reads the current user from the auth middleware, never from session tables (`CONTEXT-MAP.md`).
- Lint enforces the module boundaries: `.agents/skills/effect-v4/references/13-lint-rules.md`.

## Done means proven

- The final message of a change lists what you ran and what came out: the command, then the lines of output that show the result. A UI change adds the `verify-web` evidence. The pull request's Verification section has the same shape.
- Whatever you did not run is "inconclusive", with the reason. Never write "works", "tested" or "verified" without the output next to it.
- A check that checked nothing has not passed: 0 test files, 0 packages selected, a skipped suite, an empty diff. Say so and find out why. `scripts/changed-packages.mjs` fails CI when a changed package was not selected.

## Rules and what enforces them

A rule in this table either has a check that fails, or says that it does not. A rule with no check is a candidate for one: use the `correct` skill.

| Rule                                                                                                                        | Enforced by                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Time comes from `Clock`, randomness from `Random`, config from `Config`                                                     | lint `@boberstack/effect/no-ambient-date`; Effect diagnostics `globalDateInEffect`, `globalRandomInEffect`, `processEnvInEffect`      |
| SQL lives only in `platform/database`                                                                                       | lint `@boberstack/effect/no-domain-sql`, `@boberstack/effect/no-domain-adapters`                                                      |
| A store is tested on real Postgres, never with an in-memory fake                                                            | lint `@boberstack/effect/no-store-fakes`                                                                                              |
| Modules talk through their `index.ts`                                                                                       | lint `@boberstack/effect/module-boundaries`, `import/no-cycle`                                                                        |
| Web imports go `shared → features → app`; a feature is reached only through its `index.ts`                                  | lint `@boberstack/frontend/feature-boundaries`                                                                                        |
| Failures are typed `Schema.TaggedError`s in `*.errors.ts`                                                                   | lint `@boberstack/effect/tagged-error-naming`, `@boberstack/effect/no-untyped-failure`; diagnostic `globalErrorInEffectFailure`       |
| Every Effect is yielded, and its errors and requirements handled                                                            | diagnostics `floatingEffect`, `missingEffectError`, `missingEffectContext`, `missingLayerContext`                                     |
| `Effect.run*` only in entry points                                                                                          | lint `@boberstack/effect/run-only-in-entry-points`                                                                                    |
| Secrets are `Redacted`                                                                                                      | lint `@boberstack/effect/redacted-secrets`                                                                                            |
| No prose comments                                                                                                           | lint `@boberstack/no-comments/no-comments`                                                                                            |
| No skipped test without a `QUARANTINE:` reason, no `.only`, no per-test timeout or retry, no real-time wait or polling loop | lint `@boberstack/test-hygiene/*`; Vitest `retry: 0`, `allowOnly` off in CI                                                           |
| Every lint or type-check suppression carries a reason; no `@ts-ignore`                                                      | lint `@boberstack/suppressions/require-suppression-reason`, unused directives are errors; `pnpm check:suppressions` reports the count |
| Exact dependency versions, actions pinned by SHA                                                                            | `pnpm check:deps`                                                                                                                     |
| Documents name the installed versions                                                                                       | `pnpm check:doc-pins`                                                                                                                 |
| No unused file, export or dependency                                                                                        | `pnpm check:knip`                                                                                                                     |
| No hook bypass                                                                                                              | `.claude/hooks/block-no-verify.mjs`                                                                                                   |
| Commit subjects and PR titles are Conventional Commits                                                                      | `commit-msg` hook, `.github/workflows/pr-title.yml`                                                                                   |
| No compatibility shims                                                                                                      | partly: `pnpm check:knip` finds the unused old path; the rest is review (`no-shims`)                                                  |
| Do not invent APIs                                                                                                          | none: the `effect-v4` skill and `.repos/`                                                                                             |
| Code uses the glossary's words                                                                                              | none: review (`domain-modeling`)                                                                                                      |
| Tests check behaviour, not their own setup                                                                                  | none: review (`code-review`)                                                                                                          |
| A UI change is seen working in a browser                                                                                    | none: the `verify-web` skill and the PR's Verification section                                                                        |

## Autonomy

### On your own

Read anything; run every command in the Commands table except `pnpm run deploy`; edit code, tests, migrations you are adding, docs and skills; add a lint rule or raise a diagnostic to `error`; start and stop the local dev stack; create branches and commits when the user asked for the change.

### Never

- Never `--no-verify`, `git commit -n`, `HUSKY=0`, `VP_GIT_HOOKS=0` or another hook bypass. `.claude/hooks/block-no-verify.mjs` blocks them. A failing hook is work: fix the cause.
- Never weaken a check to make it pass: no deleted or skipped test, no raised timeout, no `oxlint-disable` without a reason on the same line, no `@ts-expect-error` without one.
- Never commit secrets, `.env*` files, generated output or customer data.
- Never force-push, rewrite published history, merge, or deploy unless the user asks.
- If the repo's rules and the task disagree, stop and ask one question with a recommendation. Keep doing independent work while you wait.

### Needs owner sign-off

- Adding, removing or changing the version of a dependency.
- Any change that loosens a check: the lint config in `vite.config.ts` and `tools/oxlint/`, `tsconfig.base.json` diagnostics, `knip.json`, `suppressions.baseline.json`, `.vite-hooks/`, `.github/`, `.claude/settings.json` and `.claude/hooks/`. The `code-review` skill lists changes to these paths above everything else.
- Adding an entry point or a composition root to the lint allow lists.
- `pnpm run deploy` to a shared stage, `alchemy destroy`, and any deploy whose plan replaces or deletes a resource.
- A migration that drops or rewrites data. Migrations are append-only: never edit one that has been applied.
- Changing an ADR's decision. Write a new ADR that supersedes it.
- Widening CORS, cookie scope, auth providers or trusted origins.
