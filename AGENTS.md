# Agent instructions

This file is the repo law for agents and contributors: what the project is for, the commands, where code goes, and when to stop and ask. How code is written is in [CODING_STANDARDS.md](CODING_STANDARDS.md). All documentation is indexed in [docs/README.md](docs/README.md).

## Project thesis

`boberstack` is a starting point for a TypeScript product built on Effect v4 end to end: an api on Cloudflare Workers, a React SPA served by the same Worker, a Node CLI, and Postgres on Neon, deployed as one Alchemy stack. The todos and sign-in examples are there to be replaced.

It optimises for a codebase an agent can extend without making it worse. Every rule that can be a lint rule, a type or a hook is one, so a mistake fails `pnpm verify` instead of waiting for a reviewer. Rules that cannot be checked live in one place each and are short.

When a project starts from this template, rewrite this section on day one. `pnpm init:project` renames the packages, not the prose.

## General rules

- Read [CONTEXT-MAP.md](CONTEXT-MAP.md) and the context's `GLOSSARY.md` before naming anything. Code uses the glossary's words.
- Anything that needs a store, the database, the network or secure randomness is an Effect service; a module-level function is pure.
- Before writing or reviewing Effect code, load the `effect-v4` skill. Before using an Effect, Alchemy or better-auth API you have not seen in this repo, read it at the pinned version: `pnpm sources:fetch` clones the tagged sources into `.repos/` (gitignored). Do not invent APIs.
- SQL lives only in `apps/api/src/platform/database/`, and a store is tested on real Postgres, never with an in-memory fake (root ADR 0004).
- No prose comments in code. A workaround for someone else's bug keeps a `VENDOR:` comment (root ADR 0005).
- Add a lint rule before cleaning up a pattern by hand, so it cannot come back. When you are corrected for the same thing twice, use the `correct` skill.
- A new version replaces the old one in the same change: no `V2`, no re-export kept for compatibility (the `no-shims` skill).
- Before Git: the `babysit-git` skill. Before a pull request: the `file-pr` skill. For prose: the `unslop` skill. To see a UI change working: the `verify-web` skill.

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
