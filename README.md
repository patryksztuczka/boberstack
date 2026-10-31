# boberstack

A TypeScript monorepo to start a product from: an Effect v4 api on Cloudflare Workers that also serves a React SPA, a Node CLI, and Postgres on Neon, deployed as one Alchemy stack. It ships with a working todo list behind sign-in, so every layer has a real example, and with the lint rules, hooks, CI and agent skills that keep the code in shape as it grows.

[AGENTS.md](AGENTS.md) holds the exact pins, commands and rules; [docs/README.md](docs/README.md) indexes the rest.

## Stack

- **Effect 4.0.7** on every server surface: `HttpApi`, RPC, CLI, SQL, Schema, Config. Pinned below 4.1.0 because Alchemy 2.0.0-beta.84 needs `effect/Crypto`.
- **Cloudflare Workers** for the api and the static SPA, one Worker on one origin.
- **Neon Postgres** through Hyperdrive in production, Postgres in Docker locally, Testcontainers in tests.
- **Alchemy 2** (beta): the infrastructure is an Effect program in `apps/infra/alchemy.run.ts`.
- **better-auth** for sign-in, wired through `@alchemy.run/better-auth`.
- **React 19** with React Router, TanStack Query, React Hook Form (validated by the same Effect Schemas the api decodes), Tailwind 4, shadcn components and Paraglide i18n (English, Polish).
- **Vite+ 1.4.0** (`vp`): dev server, build, Vitest, oxlint, oxfmt, task runner and Git hooks.
- **TypeScript 7** with Effect diagnostics, **pnpm 11**, **Node 26**.

## Quickstart

You need Node 26.13.0 (`.node-version`), pnpm 11.28.9 and Docker.

```sh
pnpm install     # also installs the Git hooks
pnpm dev         # Postgres in Docker, migrations, the api Worker via alchemy dev, the web app via vp dev
pnpm dev:doctor  # in a second terminal: checks the stack and creates demo@example.com / demo12345
```

Ports come from a hash of the checkout path, so two worktrees can run `pnpm dev` at once; `pnpm dev` prints the URLs and `node scripts/dev.mjs ports` shows them. Local tables come from `apps/api/migrations/`, applied by the CLI's `db migrate` command. Open the web URL, sign in as the demo user, and add a todo.

Before you push, `pnpm verify` runs what CI runs. The pre-push hook runs it too.

## Deploy

Deploys go through Alchemy with your own Cloudflare and Neon accounts. Connect both to an Alchemy profile once:

```sh
pnpm --filter @boberstack/infra exec alchemy profile edit --add Cloudflare --add Neon
```

In CI, set `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `NEON_API_KEY` instead. Then:

```sh
pnpm build
pnpm run deploy      # alchemy deploy; plain `pnpm deploy` is a pnpm built-in
```

The deploy creates the Neon project and applies `apps/api/migrations/`, creates the Hyperdrive config, and uploads the Worker with `apps/web/dist` as its assets. Secrets such as the better-auth secret are set in the stack, never in a committed file.

## Commands

| Command                                               | Does                                               |
| ----------------------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                                            | local Postgres, the api Worker and the web app     |
| `pnpm db:up`, `pnpm db:down`                          | start or stop this checkout's Postgres             |
| `pnpm dev:doctor`                                     | checks the dev stack, creates the demo user        |
| `pnpm dev:status`, `pnpm dev:stop`                    | show or stop this checkout's dev stack             |
| `pnpm cli <command>`                                  | the CLI against this checkout's dev stack          |
| `pnpm check`                                          | format and lint, type-aware                        |
| `pnpm typecheck`                                      | TypeScript with Effect diagnostics                 |
| `pnpm test`                                           | unit tests                                         |
| `pnpm test:integration`                               | Testcontainers suites; needs Docker                |
| `pnpm build`                                          | builds every package                               |
| `pnpm verify`                                         | check, typecheck, test, build: the CI steps        |
| `pnpm check:deps`                                     | fails on a dependency that is not an exact version |
| `pnpm check:changed`                                  | the checks for what you changed since `main`       |
| `pnpm check:doc-pins`                                 | documents agree with the installed versions        |
| `pnpm check:knip`                                     | no unused files, exports or dependencies           |
| `pnpm check:suppressions`                             | suppression count against the baseline             |
| `pnpm sources:fetch`                                  | pinned library sources into `.repos/`              |
| `pnpm run deploy`                                     | `alchemy deploy`                                   |
| `pnpm init:project -- --name <name> --scope <@scope>` | renames the project                                |

## CI

`.github/workflows/ci.yml` runs on every pull request and push to `main`, skipping docs-only changes. Each stage needs the one before it, so a cheap failure stops the expensive ones:

1. **Static**: format, lint, exact dependency versions, versions named in the docs, unused code (knip), the suppression count.
2. **Typecheck**.
3. **Unit tests**, only for the packages a change touches and their dependents. The stage fails if a changed package was not selected, so it cannot pass by testing nothing.
4. **Build**.
5. **Integration**: Testcontainers Postgres suites.

A separate workflow checks that the pull request title is a Conventional Commit. Newer runs cancel older ones on the same branch.

## Make it yours

```sh
pnpm init:project -- --name acme-shop --scope @acme
pnpm install
pnpm check
```

`--name` replaces `boberstack` and the `boberstack` prefix of every service id; `--scope` replaces `@starter`. Then rewrite the Project thesis and Architecture sections of [AGENTS.md](AGENTS.md), and replace the todos example with your first context ([CONTEXT-MAP.md](CONTEXT-MAP.md), the `domain-modeling` skill).

## Keep or cut

The starter is a working project. Delete what you will not use on day one. Lint, the type checker and the tests point at whatever still depends on what you removed. After each cut run `pnpm install`, then `pnpm verify` and `pnpm test:integration`, and update `AGENTS.md` and `CONTEXT-MAP.md`.

### The todos example

- [ ] Delete `packages/domain/src/todos/` and its group in `packages/domain/src/api.ts`.
- [ ] Delete `apps/api/src/modules/todos/`, `apps/api/src/http/todos.http.ts`, `apps/api/src/rpc/todos.rpc.ts`, and their entries in `http.layer.ts`, `rpc.layer.ts` and `app.layer.ts`.
- [ ] Delete `apps/api/src/platform/database/todo.repository.ts` and its integration test.
- [ ] Add a migration that drops the todos table. Do not delete the old migration if it has ever been applied (root ADR 0006).
- [ ] Delete `apps/web/src/features/todos/` and its routes in `router.tsx`.
- [ ] Delete `docs/internals/todos/` and the Todos lines in `CONTEXT-MAP.md`.

Keep the folders: the next context goes in the same places.

### RPC

- [ ] Delete `packages/domain/src/*/*.rpc.ts` and `apps/api/src/rpc/`.
- [ ] Remove the RPC layer from `app.layer.ts` and the RPC auth middleware from `packages/domain/src/identity/authentication.ts` and `platform/authentication/`.
- [ ] Switch the web app's hooks to the `HttpApi` client.
- [ ] Update root ADR 0007 with a superseding ADR.

### HttpApi and OpenAPI

The mirror image of cutting RPC: delete `*.http-api.ts`, `packages/domain/src/api.ts`, `apps/api/src/http/` and the HTTP auth middleware, and drop `openapi` from the CLI.

### The CLI

- [ ] Delete `apps/cli/` and its entry in the `run-only-in-entry-points` and `layer-config-only-in-roots` options in `vite.config.ts`.
- [ ] Apply local migrations another way, for example with `psql`, in the `migrate` step of `scripts/dev.mjs`, and drop the root `cli` script. Tests are unaffected: `pg-test.ts` applies the files itself.

### i18n

- [ ] Remove Paraglide from `apps/web` (its Vite plugin, `messages/`, the generated folder) and replace `m.*()` calls with literal strings.
- [ ] Drop the language switcher.

### Authentication

- [ ] Delete `apps/api/src/platform/authentication/` and `packages/domain/src/identity/`.
- [ ] Remove `.middleware(…)` from every `HttpApiGroup` and `RpcGroup`, and stop reading `CurrentUser` in handlers; Todos would then need a new ownership rule (Todos ADR 0001).
- [ ] Remove `@alchemy.run/better-auth` and `better-auth` from `apps/api/package.json` and the better-auth bindings from `apps/infra/alchemy.run.ts`.
- [ ] Add a migration that drops the better-auth tables.
- [ ] Delete `apps/web`'s sign-in feature and route guard, and `docs/internals/identity/`.

### The web app

- [ ] Delete `apps/web/` and `packages/ui/`, and the Worker's assets configuration in `apps/infra/alchemy.run.ts`.
- [ ] Remove the `react` plugin scope from the lint config.

## License

Add your own before you publish.
