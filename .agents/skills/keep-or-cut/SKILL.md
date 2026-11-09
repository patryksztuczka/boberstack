---
name: keep-or-cut
description: Set up a fresh copy of the template before any other work. If this skill still exists in the repository, nobody has set the project up yet. Run it first whenever someone asks to build, start or change anything in this project, and when they ask to rename it, cut the parts they do not need (the web app, the mobile app, the desktop app, todos, auth, RPC, MCP, the CLI, i18n) or set up GitHub. It renames the project, cuts the unused parts, records where the project came from, then deletes itself.
---

# Keep or cut

This repository is a copy of a template that ships a working product: an api Worker, a web app, a desktop app, a mobile app, a CLI, a todos example behind sign-in, and the checks that hold them together. This skill turns that copy into the owner's project. When it finishes, it deletes itself, so the next agent that opens the repository goes straight to work.

The template lives at https://github.com/patryksztuczka/boberstack. Every step that needs the upstream uses that URL.

Run the steps in order. Setup comes before the task the owner asked for. When setup is done, go back to that task.

## 1. Ask the owner

What the project is and who it is for comes from the owner. Read their request first, then ask what it leaves open, all in one round:

- The project name (lower-case kebab-case, such as `acme-shop`) and the package scope (such as `@acme`).
- Which parts to keep. Offer the list under "Keep or cut" below with a recommendation drawn from their request. A request for a mobile app recommends cutting the web app and the desktop app; a request for an api only recommends cutting every client.
- Whether to apply the GitHub settings (step 4).
- Whether to set up the R2 bucket for pull request screenshots and recordings (step 5), with its cost.

Do not start cutting before the owner has answered.

## 2. Find the upstream commit

The README will name the template commit this project started from. Find it now, while the history still holds the template's first commit:

```sh
git fetch --quiet https://github.com/patryksztuczka/boberstack.git master
git merge-base HEAD FETCH_HEAD
```

A clone shares the template's history, so `merge-base` prints the commit. A repository made with "Use this template" does not, and `merge-base` prints nothing. Then look for the template commit whose tree matches this repository's first commit:

```sh
first=$(git rev-list --max-parents=0 HEAD | tail -n 1)
tree=$(git rev-parse "$first^{tree}")
git rev-list FETCH_HEAD | while read -r commit; do
  [ "$(git rev-parse "$commit^{tree}")" = "$tree" ] && echo "$commit" && break
done
```

When neither prints a commit, take the last template commit before this repository's first one: `git rev-list -1 --before="$(git log -1 --format=%cI "$first")" FETCH_HEAD`, and say in the README that it is approximate. Keep the commit and today's date for step 8.

## 3. Rename

```sh
pnpm init:project -- --name acme-shop --scope @acme
pnpm install
pnpm check
```

`--name` replaces the template's name and the prefix of every service id; `--scope` replaces the package scope. It leaves GitHub URLs alone, so the upstream URL in this skill survives.

The mobile app has names `init:project` does not touch. If it stays, rename the bundle ids (`com.<name>.app…`) and the `<name>-dev` and `<name>-preview` schemes in `apps/mobile/app.config.ts`, and the same schemes in the trusted origins in `packages/auth/src/better-auth.ts`. `init:project` renames only the plain name and scheme.

## 4. GitHub settings

A repository created from a template gets the files, not the settings. With a yes from the owner, they run this once, with `gh` signed in as an admin of the new repository:

```sh
pnpm github:apply
```

It makes squash the only merge method, with the pull request title as the commit subject and an empty body, and deletes a branch once its pull request merges. It creates the `default-branch` ruleset from `.github/rulesets/default-branch.json`, or updates it when one with that name exists:

- The default branch, `master`, changes only through a pull request, and cannot be deleted or force-pushed.
- A pull request merges when `CI OK` and `Conventional PR title` pass and no review thread is open. No approval is required; raise `required_approving_review_count` when a second person joins.
- A repository admin can bypass every rule, including a direct push to `master`.

Rulesets on a private repository of a personal account need GitHub Pro. Whatever the answer, delete `scripts/github-apply.mjs`, `.github/rulesets/` and the `github:apply` script in `package.json` afterwards: they are for one use.

## 5. Screenshots and recordings in pull requests

An agent cannot drag a file into a pull request, so without help its `verify-web` screenshots and recordings stay on its disk. The template ships an upload to a public Cloudflare R2 bucket that prints Markdown to paste ([pr-evidence.md](../../../docs/operations/pr-evidence.md)), but not the bucket.

Tell the owner what it costs: a public bucket on the project's Cloudflare account, objects deleted after 180 days, and synthetic data only. With a yes, the owner runs `pnpm -s pr-evidence setup` once and the agent signs in with `wrangler login`. With a no, delete the pieces listed under "Take it out" on that page.

## 6. Keep or cut

Delete what the project will not use on day one. Lint, the type checker and the tests point at whatever still depends on what you removed. After each cut:

- run `pnpm install`, then `pnpm verify` and `pnpm test:integration`;
- search for the part's paths and names (`grep -rn` for the folder, the package name, the script); every hit outside a superseded ADR is a leftover;
- update `AGENTS.md`, `CONTEXT-MAP.md` and the pages in `docs/user/` and `docs/operations/` that describe what you cut;
- commit the cut on its own, such as `chore: cut the web app`.

Cuts touch paths that need the owner's sign-off: dependencies, the lint config, migrations that drop tables. Make them and list them under "Needs sign-off" in your final message, as `AGENTS.md` says.

### The welcome page and the beaver

- [ ] Delete `apps/web/src/features/welcome/`, point the index route in `apps/web/src/app/router.tsx` at your own page, and remove the `welcome_*` messages from `apps/web/messages/*.json`.
- [ ] Replace or delete `apps/web/src/assets/` (the beaver as SVG, PNG, the animated SVG at the top of the README and the favicon head) and the icons in `apps/web/public/` (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`).
- [ ] Delete `apps/mobile/src/features/welcome/` and its screen, and the beaver in `packages/ui/src/beaver/`, or replace them with your own.

### The todos example

- [ ] Delete `packages/domain/src/todos/` and its group in `packages/domain/src/api.ts`.
- [ ] Delete `packages/core/src/todos/`, `apps/api/src/http/todos.http.ts`, `apps/api/src/rpc/todos.rpc.ts`, and their entries in `http.layer.ts`, `rpc.layer.ts` and `app.layer.ts`.
- [ ] Delete `packages/database/src/todo.repository.ts`, its integration test and its export in `packages/database/src/index.ts`.
- [ ] Add a migration that drops the todos table. Do not delete the old migration if it has ever been applied (root ADR 0014).
- [ ] Delete `apps/web/src/features/todos/` and its routes in `router.tsx`, and `apps/mobile/src/features/todos/` and its screen in `apps/mobile/src/app/navigation.tsx`.
- [ ] Delete `docs/internals/todos/`, `docs/user/todos.md`, the Todos lines in `CONTEXT-MAP.md` and `.agents/skills/verify-web/features/todos.md`.

Keep the folders: the next context goes in the same places. Model it with the `domain-modeling` skill.

### RPC

- [ ] Delete `packages/domain/src/*/*.rpc.ts` and `apps/api/src/rpc/`.
- [ ] Remove the RPC layer from `app.layer.ts` and the RPC auth middleware from `packages/domain/src/identity/authentication.ts` and `packages/auth/src/authentication.layer.ts`.
- [ ] Delete the RPC clients (`packages/client-runtime/src/*/*-rpc-client.ts`) and provide the `HttpApi` ones (`*-http-client.ts`) in their place.
- [ ] Supersede root ADR 0007 with a new ADR.

### MCP

- [ ] Delete `packages/domain/src/*/*.mcp.ts`, `apps/api/src/mcp/` and the MCP layer in `app.layer.ts`.
- [ ] Delete `packages/auth/src/mcp-authentication.ts`, `access-token.errors.ts`, and `jwt()`, `mcp()` and `mcpResourceServer` in `packages/auth/src/better-auth.ts`; remove `@better-auth/mcp` and `@better-auth/oauth-provider`.
- [ ] Delete `packages/client-runtime/src/identity/mcp-client-directory*`, the consent page and `mcp-client-request.ts` in `apps/web/src/features/auth/`, the `oauthProviderClient()` plugin, the `/oauth/consent` route, and the `/.well-known` routes in `apps/api/src/worker.ts` and `apps/web/vite.config.ts`.
- [ ] Add a migration that drops the OAuth provider tables (root ADR 0014), delete `docs/user/ai-assistants.md`, and supersede root ADR 0015 and Identity ADR 0002.

### HttpApi and OpenAPI

The mirror image of cutting RPC: delete `*.http-api.ts`, `packages/domain/src/api.ts`, `apps/api/src/http/` and the HTTP auth middleware, delete the `HttpApi` clients in `packages/client-runtime/src/` and provide the RPC ones in their place, and drop `openapi` from the CLI.

### The CLI

- [ ] Delete `apps/cli/` and its entry in the `run-only-in-entry-points` and `layer-config-only-in-roots` options in `tools/oxlint/lint.config.ts`.
- [ ] Apply migrations another way, locally in the `migrate` step of `scripts/dev.mjs` (for example with `psql`) and in production in the `deploy` script in `package.json`, and drop the root `cli` script. Tests are unaffected: `pg-test.ts` applies the files itself.

### i18n

- [ ] Remove Paraglide from `apps/web` (its Vite plugin, `messages/`, `project.inlang`, the generated folder and its lines in `.gitignore`, `vite.config.ts`, `tools/oxlint/lint.config.ts` and `scripts/suppressions.mjs`) and replace `m.*()` calls with literal strings.

### Authentication

- [ ] Delete `packages/auth/`, `packages/domain/src/identity/`, and `packages/client-runtime/src/identity/` and `session/`.
- [ ] Remove `.middleware(…)` from every `HttpApiGroup` and `RpcGroup`, and stop reading `CurrentUser` in handlers; Todos would then need a new ownership rule (Todos ADR 0001).
- [ ] Remove `@boberstack/auth` and `@alchemy.run/better-auth` from `apps/api/package.json`, `packages/auth` from `apps/api/tsconfig.json`, and the better-auth bindings from `apps/api/src/worker.ts`.
- [ ] Add a migration that drops the better-auth tables.
- [ ] Delete the sign-in features and route guards of `apps/web` and `apps/mobile`, `docs/internals/identity/`, `docs/user/sign-in.md` and `.agents/skills/verify-web/features/auth.md`.

### The web app

The desktop app serves the web app's build (root ADR 0010), so cutting the web app cuts the desktop app too.

- [ ] Delete `apps/web/`, its reference in the root `tsconfig.json`, its entry in `knip.json`, and the `apps/web` overrides in `tools/oxlint/lint.config.ts` (the `react` plugin scope and `feature-boundaries`), `vite.config.ts`, `scripts/suppressions.mjs` and `.gitignore`.
- [ ] Remove `assets` from the Worker in `apps/api/src/worker.ts`. The Worker then answers `/api/*` and `/.well-known/*` only.
- [ ] In `scripts/dev.mjs`, drop the `web` child and its health check and point the mobile app's `EXPO_PUBLIC_API_URL` at the api URL. In `scripts/dev-ports.mjs`, drop the `web` port and point `AUTH_BASE_URL` at the api. Remove `DEV_WEB_PORT` from `.env.schema`.
- [ ] Delete `scripts/web-boot.mjs`, the `check:web-boot` script and its step in `.github/workflows/ci.yml`, the `browser` script and the `agent-browser` devDependency.
- [ ] Delete the `verify-web` skill (`.agents/skills/verify-web/` and its link in `.claude/skills/`). Move its launch step into `verify-mobile`, which borrows it, and replace its mentions in `AGENTS.md`, the playbook and principle skills and `.github/pull_request_template.md` with `verify-mobile`, or with a request against the api when no client is left.
- [ ] The mobile app imports `@boberstack/ui/beaver`. If it stays, keep what it imports from `packages/ui` and delete the web-only rest (the styles and the shadcn components); otherwise delete `packages/ui/` with its lint scope.
- [ ] Rewrite the web lines in `docs/operations/development.md` and `deploy.md`, and supersede root ADRs whose decision no longer holds.

### The desktop app

- [ ] Delete `apps/desktop/`, its reference in the root `tsconfig.json`, and its entries in `tools/oxlint/lint.config.ts` (the `layer-config-only-in-roots` and `run-only-in-entry-points` allow lists and the two overrides that list `apps/desktop/**`).
- [ ] Remove the `desktop` task from `scripts/dev.mjs`, the root `dev:desktop` script and the `DESKTOP_*` variables in `.env.schema`.
- [ ] Delete the "Desktop app" section of `docs/operations/development.md`, the desktop rows in `AGENTS.md`, and the desktop lines in `tools/oxlint/boberstack/effect/README.md` and in references 07, 10 and 13 of the `effect-best-practices` skill. `docs/operations/mobile.md` takes the app icon from `apps/desktop/resources/icon.png`: name another source.
- [ ] Mark root ADR 0010 superseded.

### The mobile app

- [ ] Delete `apps/mobile/`, its reference in the root `tsconfig.json`, the `apps/mobile` overrides in `tools/oxlint/lint.config.ts` and `vite.config.ts`, and its lines in `.gitignore`.
- [ ] Remove the `mobile` task from `scripts/dev.mjs`, the `metro` port from `scripts/dev-ports.mjs`, the root `dev:mobile` script and the mobile variables in `.env.schema`.
- [ ] Remove `expo()` and the app schemes from `packages/auth/src/better-auth.ts`, and `@better-auth/expo` from `packages/auth/package.json`.
- [ ] Delete `docs/operations/mobile.md` and mark root ADR 0011 superseded.
- [ ] Delete the `verify-mobile` skill (`.agents/skills/verify-mobile/` and its link in `.claude/skills/`), the `agent-device` devDependency and the root `device` script, the `@boberstack/frontend/accessible-controls` rule in `tools/oxlint/`, and the `verify-mobile` lines in `AGENTS.md` and the playbook skills.

## 7. Write the project's own words

- [ ] Rewrite the "Project thesis" section of `AGENTS.md` for this project.
- [ ] Rewrite `README.md` for this project: what it is, the quickstart and deploy for the parts that stayed, and the "Origin" section from step 8. Drop the beaver, the template's pitch and its "Make it yours" section.
- [ ] Rewrite `docs/user/` for the product, and the `docs/README.md` index to match what is left.

## 8. Remove the setup and leave a trail

The project no longer needs the template's setup tools. Leave a note that says where it came from, so a part cut today can come back later.

Add this section to the end of `README.md`, with the commit and date from step 2 and the parts you cut:

```md
## Origin

This project started from the template at https://github.com/patryksztuczka/boberstack, commit [`<sha>`](https://github.com/patryksztuczka/boberstack/tree/<sha>), on <date>.

Setup cut <the parts, such as the web app, the desktop app and the todos example>. To bring a part back, read its section in the template's [keep-or-cut skill](https://github.com/patryksztuczka/boberstack/blob/<sha>/.agents/skills/keep-or-cut/SKILL.md): it lists every file and line the part touches. Copy those from the template, then compare with the template's latest `master` for newer versions.
```

Then:

- [ ] In `AGENTS.md`, replace the line that sends agents to this skill with: `- This project started from a template. To bring back a part cut at setup, or to compare with the template, read the "Origin" section of the README.`
- [ ] Delete `scripts/init.mjs`, the `init:project` script in `package.json` and its row in `AGENTS.md`.
- [ ] Delete this skill: `.agents/skills/keep-or-cut/` and the link `.claude/skills/keep-or-cut`.
- [ ] `grep -rn keep-or-cut .` must print only the README's "Origin" section. Point every other link at the skill's upstream copy at `<sha>`, or drop it.
- [ ] Run `pnpm verify` and `pnpm test:integration`, then commit, such as `chore: finish setting up the project from the template`.

Then report to the owner: the name, what you kept and cut, the upstream commit, and the "Needs sign-off" list. Go on with the task they asked for.
