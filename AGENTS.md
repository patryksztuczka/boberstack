# Agent instructions

This file is the repo law for agents and contributors: what the project is for, the commands, where code goes, and when to stop and ask. How code is written is in [CODING_STANDARDS.md](CODING_STANDARDS.md). All documentation is indexed in [docs/README.md](docs/README.md).

## Project thesis

`boberstack` is a starting point for a TypeScript product built on Effect v4 end to end: an api that runs as a Node server in a container, a React SPA served by the same server, a Node CLI, and Postgres from any provider, deployed as one Alchemy stack. A Cloudflare Workers host ships as the alternative. The todos and sign-in examples are there to be replaced.

It optimises for a codebase an agent can extend without making it worse. Every rule that can be a lint rule, a type or a hook is one, so a mistake fails `pnpm verify` instead of waiting for a reviewer. Rules that cannot be checked live in one place each and are short.

When a project starts from this template, the `keep-or-cut` skill rewrites this section.

## General rules

- If `.agents/skills/keep-or-cut/` exists, nobody has set this project up from the template yet. Run the `keep-or-cut` skill before any other task.
- Read [CONTEXT-MAP.md](CONTEXT-MAP.md) and the context's `GLOSSARY.md` before naming anything. Code uses the glossary's words.
- Features are service methods in `packages/core/src/<context>/`; apps compose them and transports stay thin (root ADR 0007). An operation is one contract, implemented once and projected onto HttpApi, RPC and MCP (root ADR 0014). Its capability reads the Current User, calls one service method and maps its errors, if they are not already wire errors. Pure work (a slug, a label, a calculation) can be a plain function next to the service.
- Before writing or reviewing Effect code, load the `effect-best-practices` skill. Before using an Effect, Alchemy or better-auth API you have not seen in this repo, read it at the pinned version: `pnpm sources:fetch` clones the tagged sources into `.repos/` (gitignored). Do not invent APIs.
- SQL lives only in `packages/database/`, and a store is tested on real Postgres, never with an in-memory fake (root ADR 0003).
- No prose comments in code. A workaround for someone else's bug keeps a `VENDOR:` comment (root ADR 0004).
- Add a lint rule before cleaning up a pattern by hand, so it cannot come back. When you are corrected for the same thing twice, use the `correct` skill.
- A new version replaces the old one in the same change: no `V2`, no re-export kept for compatibility (the `principle-no-shims` skill).
- Work by task type with the `playbook-*` skills: bug fix, feature, refactoring, investigation, prototype, perf issue, hillclimb.
- The `principle-*` skills and `benchmark-checklist` do not load on their own. When a playbook, a skill or a review names one, read `.agents/skills/<name>/SKILL.md`.
- Before Git: the `babysit-git` skill. Before a pull request: the `file-pr` skill. For prose: the `unslop` skill. To see a UI change working: the `verify-web` skill, and `verify-mobile` for the mobile app.

## Commands

| Command                                               | Does                                                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                        | installs; `prepare` runs `vp config`, which installs the Git hooks                                                                                                                 |
| `pnpm db:up`                                          | starts local Postgres in Docker                                                                                                                                                    |
| `pnpm dev`                                            | local Postgres, the api server under `node --watch`, and `vp dev` for the web app with `/api` proxied to the api. Ports are per checkout (below)                                   |
| `pnpm check`                                          | `vp check`: oxfmt and oxlint, type-aware                                                                                                                                           |
| `pnpm typecheck`                                      | TypeScript 7 with Effect diagnostics                                                                                                                                               |
| `pnpm test`                                           | unit tests in every package                                                                                                                                                        |
| `pnpm test:integration`                               | Testcontainers suites; needs Docker                                                                                                                                                |
| `pnpm build`                                          | builds every package                                                                                                                                                               |
| `pnpm verify`                                         | check, `env:check`, typecheck, test and build: the same steps as CI. The pre-push hook runs it                                                                                     |
| `pnpm check:deps`                                     | fails on a dependency that is not an exact version                                                                                                                                 |
| `pnpm check:doc-pins`                                 | fails when a document names a version the workspace does not install                                                                                                               |
| `pnpm check:knip`                                     | fails on unused files, exports and dependencies                                                                                                                                    |
| `pnpm check:web-boot`                                 | opens the built `apps/web/dist`, served like the api serves it, in Chrome through agent-browser; fails when a page does not mount or logs an error                                 |
| `pnpm check:api-image`                                | builds `apps/infra/api.Dockerfile`, runs it against a throwaway Postgres migrated with `cli db migrate` and checks that it serves the api and the web app; needs Docker            |
| `pnpm env:check`                                      | `varlock load`: validates the environment, `.env.local` included, against `.env.schema`                                                                                            |
| `pnpm check:suppressions`                             | counts lint and type-check suppressions against `suppressions.baseline.json`; reports growth, never fails                                                                          |
| `pnpm check:changed`                                  | format, lint, typecheck and unit tests for the files changed since `master`                                                                                                        |
| `pnpm dev:doctor`                                     | checks the running dev stack and Mailpit, and creates and verifies the demo user `demo@example.com` / `demo12345` through the mail                                                 |
| `pnpm dev:desktop`                                    | builds `apps/desktop` and opens it on this checkout's running `pnpm dev`, with its own user data in `.dev/desktop`; arguments after `--` go to Electron                            |
| `pnpm dev:mobile`                                     | builds `apps/mobile` for the iOS simulator and runs it against this checkout's running `pnpm dev`; arguments after `--` go to `expo run:ios` ([mobile](docs/operations/mobile.md)) |
| `pnpm dev:status`, `pnpm dev:stop`, `pnpm db:down`    | show or stop the dev stack of this checkout; `db:down` also stops its Postgres                                                                                                     |
| `pnpm cli <command>`                                  | runs `apps/cli` (`db migrate`, `openapi`, `health`) against this checkout's database and api                                                                                       |
| `pnpm -s device <command>`                            | runs agent-device, which drives the iOS simulator and the Android emulator for the `verify-mobile` skill ([mobile](docs/operations/mobile.md#drive-it-with-agent-device))          |
| `pnpm pr-evidence <files>`                            | uploads screenshots and recordings to the R2 bucket and prints the Markdown for a pull request ([pr-evidence](docs/operations/pr-evidence.md))                                     |
| `pnpm sources:fetch`                                  | clones the pinned sources of Effect, Alchemy and better-auth into `.repos/`                                                                                                        |
| `pnpm run deploy`                                     | builds, migrates, then `alchemy deploy` of the container stack `apps/infra/alchemy.run.ts`. Plain `pnpm deploy` is pnpm's own command                                              |
| `pnpm init:project -- --name <name> --scope <@scope>` | renames the project, the package scope and the service-id prefix                                                                                                                   |

`pnpm dev` derives its ports from a hash of the checkout path, so worktrees run side by side; each also gets its own Compose project, database and Mailpit inbox (local mail, root ADR 0006). `node scripts/dev.mjs ports` prints them, `.dev/state.json` holds the running URLs and pids, `.dev/logs/` the logs, and `DEV_WEB_PORT`, `DEV_API_PORT`, `DEV_POSTGRES_PORT`, `DEV_MAILPIT_PORT` and `DEV_METRO_PORT` (the mobile app's Metro) override them.

Build the change first, then check it once at the end: `pnpm check:changed` for what you touched, then `pnpm verify`, plus `pnpm test:integration` when you touched SQL, migrations, auth or an endpoint, plus the `verify-web` skill when you touched the web UI and `verify-mobile` when you touched the mobile app.

Git hooks come from Vite+: `pre-commit` runs `vp staged`, `commit-msg` checks the Conventional Commit subject, `pre-push` runs `pnpm verify`.

## Where things go

| You are adding                         | It goes in                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a record, id or error the client sees  | `packages/domain/src/<context>/`                                                                                                                                                                             |
| an operation (endpoint, RPC, MCP tool) | a `defineContract` in `packages/domain/src/<context>/<context>.contracts.ts`, added to the context's contract list; its `implement` in `apps/api/src/capabilities/<context>.capabilities.ts` (root ADR 0014) |
| business logic                         | `packages/core/src/<context>/x.service.ts`                                                                                                                                                                   |
| a query or a table                     | a store port in the core module, SQL in `packages/database/src/x.repository.ts`, a new file in `packages/database/migrations/`                                                                               |
| a typed api client the apps share      | a port and its HttpApi or RPC layer in `packages/client-runtime/src/<context>/`; the app provides `HttpClient` and `ApiOrigin`                                                                               |
| data a screen reads or changes         | an atom in `packages/client-runtime/src/<context>/x.atoms.ts` on `clientRuntime`; the app reads it with `@effect/atom-react` (root ADR 0010)                                                                 |
| a call to another system               | a port in the core module, the adapter in its own package, `packages/<system>/` (root ADR 0007)                                                                                                              |
| an email                               | a template in `packages/core/src/mail/templates/`, sent through the `Mailer` port (root ADR 0006)                                                                                                            |
| an entry point that runs services      | a composition root in `apps/<name>/` that provides core with adapter packages, and its own source of identity (root ADR 0007)                                                                                |
| an env var or secret                   | a line in `.env.schema` (`@sensitive` for a secret), read with `Config` in a `layerConfig` in an adapter package; the local value in `.env.local`                                                            |
| a screen                               | `apps/web/src/features/<name>/`; what other features may use is exported from its `index.ts`                                                                                                                 |
| a mobile screen                        | `apps/mobile/src/features/<name>/`, by the same rules as a web screen; every control gets a `testID` ([mobile](docs/operations/mobile.md#accessibility-and-test-ids))                                        |
| a UI primitive                         | `packages/ui`                                                                                                                                                                                                |
| desktop shell behaviour                | `apps/desktop/src/`: decisions as plain functions with tests, Electron calls only in `main.ts` (root ADR 0008)                                                                                               |
| a bounded context                      | `CONTEXT-MAP.md`, `docs/internals/<context>/GLOSSARY.md`, then code (the `domain-modeling` skill)                                                                                                            |
| a decision worth remembering           | an ADR (the `domain-modeling` skill)                                                                                                                                                                         |
| how a user does something              | a section in `docs/user/<feature>.md`, in the product's voice ([docs/README.md](docs/README.md#writing-user-docs))                                                                                           |
| a setup, deploy or debugging procedure | `docs/operations/`                                                                                                                                                                                           |

## Autonomy

The owner reviews after the fact, so an agent does not wait for permission on work that a revert can undo. Make the call, do the work, then say what you did and why. Ask first only when a step cannot be undone or reaches outside this repository. What a feature does and who it is for comes from the owner; how it is built is yours.

### On your own

Read anything; run every command in the Commands table except `pnpm run deploy`; edit code, tests, migrations you are adding, docs and skills; add a lint rule or raise a diagnostic to `error`; start and stop the local dev stack; create branches and commits when the user asked for the change. The changes under "Needs owner sign-off" are yours to make too, flagged as that section says.

If the repo's rules and the task disagree, do the version that keeps the rule and finish it. End your reply with the disagreement and what you recommend changing.

### Ask first

These cannot be undone with a revert, or they weaken the checks the after-the-fact review relies on:

- `pnpm run deploy` to a shared stage, `alchemy destroy`, and any deploy whose plan replaces or deletes a resource.
- Running a migration that drops or rewrites data against any database but this checkout's local one.
- Loosening a check in `.vite-hooks/`, `.github/`, `.claude/settings.json` or `.claude/hooks/`.

### Never

- Never `--no-verify`, `git commit -n`, `HUSKY=0`, `VP_GIT_HOOKS=0` or another hook bypass. `.claude/hooks/block-no-verify.mjs` blocks them. A failing hook is work: fix the cause.
- Never weaken a check to make your own change pass: no deleted or skipped test, no raised timeout, no `oxlint-disable` without a reason on the same line, no `@ts-expect-error` without one.
- Never commit secrets, `.env*` files, generated output or customer data.
- Never commit screenshots or recordings: a pull request shows them only as links printed by `pnpm -s pr-evidence`, and without that upload they go in the chat.
- Never force-push, rewrite published history, merge, or deploy unless the user asks.

### Needs owner sign-off

The owner signs these off after the work is done, not before you start. Make each one when the task needs it, in its own commit whose body says why, and finish the task. Then list them in your final message to the user, under "Needs sign-off": one line per change, saying what changed and why. The list goes in the chat, not in the pull request description. The `code-review` skill lists changes to these paths above everything else.

- Adding, removing or changing the version of a dependency.
- Any change that loosens a check in the lint config in `vite.config.ts` and `tools/oxlint/`, `tsconfig.base.json` diagnostics, `knip.json` or `suppressions.baseline.json`, because the check is wrong and not because your change fails it.
- Adding an entry point or a composition root to the lint allow lists.
- A migration that drops or rewrites data. Migrations are append-only: never edit one that has been applied.
- Changing an ADR's decision. Write a new ADR that supersedes it.
- Widening CORS, cookie scope, auth providers or trusted origins.
