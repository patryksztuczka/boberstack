# Make it yours

```sh
pnpm init:project -- --name acme-shop --scope @acme
pnpm install
pnpm check
```

`--name` replaces `boberstack` and the `boberstack` prefix of every service id; `--scope` replaces `@starter`. Then rewrite the Project thesis section of [AGENTS.md](../../AGENTS.md), replace the todos example with your first context ([CONTEXT-MAP.md](../../CONTEXT-MAP.md), the `domain-modeling` skill), and rewrite `docs/user/` for your product.

## GitHub settings

A repository created from a template gets the files, not the settings. Apply them once, with `gh` signed in as an admin of the new repository:

```sh
pnpm github:apply
```

It makes squash the only merge method, with the pull request title as the commit subject and an empty body, and deletes a branch once its pull request merges. It creates the `default-branch` ruleset from `.github/rulesets/default-branch.json`, or updates it when one with that name exists:

- The default branch, `master`, changes only through a pull request, and cannot be deleted or force-pushed.
- A pull request merges when `CI OK` and `Conventional PR title` pass and no review thread is open. No approval is required; raise `required_approving_review_count` when a second person joins.
- A repository admin can bypass every rule, including a direct push to `master`.

Then delete `scripts/github-apply.mjs`, `.github/rulesets/` and the `github:apply` script in `package.json`. Rulesets on a private repository of a personal account need GitHub Pro.

## Keep or cut

The starter is a working project. Delete what you will not use on day one. Lint, the type checker and the tests point at whatever still depends on what you removed. After each cut run `pnpm install`, then `pnpm verify` and `pnpm test:integration`, and update `AGENTS.md`, `CONTEXT-MAP.md` and the pages in `docs/user/` that describe what you cut.

### The welcome page and the beaver

- [ ] Delete `apps/web/src/features/welcome/`, point the index route in `apps/web/src/app/router.tsx` at your own page, and remove the `welcome_*` messages from `apps/web/messages/*.json`.
- [ ] Replace or delete `apps/web/src/assets/` (the beaver as SVG, PNG, the animated SVG at the top of the README and the favicon head) and the icons in `apps/web/public/` (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`).

### The todos example

- [ ] Delete `packages/domain/src/todos/` and its group in `packages/domain/src/api.ts`.
- [ ] Delete `apps/api/src/modules/todos/`, `apps/api/src/http/todos.http.ts`, `apps/api/src/rpc/todos.rpc.ts`, and their entries in `http.layer.ts`, `rpc.layer.ts` and `app.layer.ts`.
- [ ] Delete `apps/api/src/platform/database/todo.repository.ts` and its integration test.
- [ ] Add a migration that drops the todos table. Do not delete the old migration if it has ever been applied (root ADR 0006).
- [ ] Delete `apps/web/src/features/todos/` and its routes in `router.tsx`.
- [ ] Delete `docs/internals/todos/`, `docs/user/todos.md` and the Todos lines in `CONTEXT-MAP.md`.

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

### Authentication

- [ ] Delete `apps/api/src/platform/authentication/` and `packages/domain/src/identity/`.
- [ ] Remove `.middleware(…)` from every `HttpApiGroup` and `RpcGroup`, and stop reading `CurrentUser` in handlers; Todos would then need a new ownership rule (Todos ADR 0001).
- [ ] Remove `@alchemy.run/better-auth` and `better-auth` from `apps/api/package.json` and the better-auth bindings from `apps/infra/alchemy.run.ts`.
- [ ] Add a migration that drops the better-auth tables.
- [ ] Delete `apps/web`'s sign-in feature and route guard, `docs/internals/identity/` and `docs/user/sign-in.md`.

### The web app

- [ ] Delete `apps/web/` and `packages/ui/`, and the Worker's assets configuration in `apps/infra/alchemy.run.ts`.
- [ ] Remove the `react` plugin scope from the lint config.
