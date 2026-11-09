---
name: keep-or-cut
description: Set up a fresh copy of the template before any other work. If this skill still exists in the repository, nobody has set the project up yet. Run it first whenever someone asks to build, start or change anything in this project, and when they ask to rename it, cut the parts they do not need (the web app, the mobile app, the desktop app, todos, auth, RPC, MCP, the CLI, i18n), choose hosting or set up GitHub. It walks the owner through what to keep, which api transport (HttpApi or RPC) and where to host, renames the project, cuts the unused parts, records where the project came from, then deletes itself.
---

# Keep or cut

This repository is a copy of a template that ships a working product: an api, a web app, a desktop app, a mobile app, a CLI, a todos example behind sign-in, and the checks that hold them together. This skill turns that copy into the owner's project. When it finishes, it deletes itself, so the next agent that opens the repository goes straight to work.

The template lives at https://github.com/patryksztuczka/boberstack. Every step that needs the upstream uses that URL.

Run the steps in order. Setup comes before the task the owner asked for. When setup is done, go back to that task.

## 1. Guide the owner

Act as a guide, not a form. The owner may never have read this template. For each choice, say in plain words what the part does, what keeping it costs and what cutting it costs, then recommend one option based on their request. Ask in short rounds, in the order below, and wait for each answer. Write in the owner's language. Skip what their request already settles.

### What the project is

- What they are building and who uses it.
- The project name (lower-case kebab-case, such as `acme-shop`) and the package scope (such as `@acme`). Suggest both.

### Decide now or later

Then offer two ways in, and say that both are fine:

- Decide now: go through the rounds below and cut what the project will not use.
- Not sure yet: cut nothing. Rename the project, keep every part, run locally, and start building. Everything left in place still works and passes `pnpm verify`, so it costs only the code you are not using. Any part can be cut later with its checklist, which the README's "Origin" section links to. Recommend this when the owner hesitates over what they need, or when the request is an idea they want to try.

On "not sure yet", skip to "The repository", then run steps 2 to 5, skip step 6, keep the container in step 7, and finish with steps 8 and 9.

### Which clients

| Part            | What it is                                         | Depends on                            |
| --------------- | -------------------------------------------------- | ------------------------------------- |
| The web app     | a React SPA that the api serves on the same origin |                                       |
| The desktop app | an Electron window around the web app              | the web app                           |
| The mobile app  | an Expo app for iOS and Android                    | `packages/ui` for the beaver only     |
| The CLI         | Node commands: `db migrate`, `openapi`, `health`   | the deploy applies migrations with it |

A request for a mobile app means cutting the web and desktop apps. An api that other systems call means cutting every client.

### How the clients talk to the api

The api serves one contract from `packages/domain` over two transports (root ADR 0005). Explain the difference before you ask:

- HttpApi is REST. Each operation is a URL and an HTTP method, and the api publishes an OpenAPI document generated from the contract. Anything can call it: curl, an app in another language, a partner, a webhook. The mobile app, the health check, sign-in methods and the MCP client directory use it, and so does the web app by default.
- Effect RPC is typed calls over one endpoint. The client gets each operation's result and error types straight from the contract, with no URLs or status codes to map. Only an Effect client can call it, and there is no OpenAPI document. The web app uses it for todos when started with `VITE_TODOS_TRANSPORT=rpc`.
- Both ship today. Each operation is then declared twice, once per transport, over the same schemas, and one service method handles both.

Recommend HttpApi alone when anyone besides the project's own TypeScript clients will call the api, and when the owner is unsure: everything in the template already uses it, so cutting RPC is the small cut. Recommend RPC alone only when every caller is the project's own Effect client and the owner wants typed errors end to end. Cutting HttpApi first moves the health check, sign-in methods, the MCP client directory and the mobile app to RPC. Keeping both costs two declarations per operation. Sign-in works on any choice: better-auth serves `/api/auth/*` itself.

### Which features

- The todos example. Cut it almost always: the project's first own context takes its place.
- Sign-in with better-auth: email and password with a confirmation mail, social sign-in when configured. Keep it when the product has users.
- MCP: an AI assistant signs in with OAuth and acts on a user's data. Needs sign-in.
- i18n with Paraglide, English only, in the web app.
- The welcome page and the beaver.

### Where it will run

The api is a Node server in a container image, and Alchemy deploys that image (root ADR 0013). Ask first whether the owner already knows where the project will run. When they do not, recommend keeping the container and deciding later: nothing outside `apps/infra/` depends on the host, so moving is one change there. Then lay out the options:

- Not decided, or only locally for now. Keep the container. `pnpm dev` runs everything on this machine, and the stack waits unused until the first deploy.
- A server of their own: a VPS, a home server, any machine with Docker. Keep the container. `pnpm run deploy` builds the image on that machine over SSH (`DEPLOY_DOCKER_HOST`) and runs it there. The owner needs Docker on the server, a Postgres it can reach, a domain with TLS in front of the container (Caddy or Traefik) and a mail transport.
- A cloud that runs containers: AWS (ECS, App Runner), Google Cloud Run, Fly.io, Hetzner, Kubernetes, Azure Container Apps. Keep the container. Alchemy has a resource for each except Azure, and swapping `Docker.Container` in `apps/infra/alchemy.run.ts` for it, with the same image, is a feature of its own (step 7). Azure runs the same image without Alchemy, or on AKS through `@alchemy.run/kubernetes`.
- Cloudflare. Switch to the Worker host: one Worker serves the api and the web build on one origin and reaches any Postgres on the internet (Neon, Supabase, RDS) through Hyperdrive. The owner needs a Cloudflare account, a Postgres URL and a mail transport. Name the Worker limits: no long-lived process, no filesystem, no Node-only libraries in the api, recurring work through Cron Triggers.

### How it sends mail

Sign-up sends a confirmation mail, so a deployed api needs a mail provider. The template ships only Mailpit, which keeps every mail on this machine, and an api without a production transport refuses to start (root ADR 0006). Ask which provider the owner uses or wants: an HTTP API such as Resend, Postmark, Amazon SES or Mailgun works on every host, SMTP on the container, Cloudflare Email Service on the Cloudflare host. Do not pick one for them. When they do not know yet, keep Mailpit and add the transport before the first deploy. Adding it is a feature of its own (step 7).

### The repository

- Whether to apply the GitHub settings (step 4).
- Whether to set up the R2 bucket for pull request screenshots and recordings (step 5), with its cost. It lives on Cloudflare whatever the hosting.

### Confirm the plan

Before you change anything, write the plan back as one short list: name and scope, what stays, what goes, the transport, the hosting, the mail provider, the GitHub settings and the bucket. Start when the owner says yes.

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

When neither prints a commit, take the last template commit before this repository's first one: `git rev-list -1 --before="$(git log -1 --format=%cI "$first")" FETCH_HEAD`, and say in the README that it is approximate. Keep the commit and today's date for step 9.

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
- search for the part's paths and names (`grep -rn` for the folder, the package name, the script); every hit is a leftover, except in an ADR this step supersedes;
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
- [ ] Add a migration that drops the todos table. Do not delete the old migration if it has ever been applied (root ADR 0011).
- [ ] Delete `apps/web/src/features/todos/` and its routes in `router.tsx`, and `apps/mobile/src/features/todos/` and its screen in `apps/mobile/src/app/navigation.tsx`.
- [ ] Delete `docs/internals/todos/`, `docs/user/todos.md`, the Todos lines in `CONTEXT-MAP.md` and `.agents/skills/verify-web/features/todos.md`.

Keep the folders: the next context goes in the same places. Model it with the `domain-modeling` skill.

### RPC

- [ ] Delete `packages/domain/src/*/*.rpc.ts` and `apps/api/src/rpc/`.
- [ ] Remove the RPC layer from `app.layer.ts` and the RPC auth middleware from `packages/domain/src/identity/authentication.ts` and `packages/auth/src/authentication.layer.ts`.
- [ ] Delete the RPC clients (`packages/client-runtime/src/*/*-rpc-client.ts`) and their exports, and the `VITE_TODOS_TRANSPORT` switch in `apps/web/src/runtime.ts`, the transport line on the todos page and the RPC steps in `.agents/skills/verify-web/features/todos.md`.
- [ ] Supersede root ADR 0005 with a new ADR.

### MCP

- [ ] Delete `packages/domain/src/*/*.mcp.ts`, `apps/api/src/mcp/` and the MCP layer in `app.layer.ts`.
- [ ] Delete `packages/auth/src/mcp-authentication.ts`, `access-token.errors.ts`, and `jwt()`, `mcp()` and `mcpResourceServer` in `packages/auth/src/better-auth.ts`; remove `@better-auth/mcp` and `@better-auth/oauth-provider`.
- [ ] Delete `packages/client-runtime/src/identity/mcp-client-directory*`, the consent page and `mcp-client-request.ts` in `apps/web/src/features/auth/`, the `oauthProviderClient()` plugin, the `/oauth/consent` route, and the `/.well-known` routes in `apps/api/src/worker.ts` and `apps/web/vite.config.ts`.
- [ ] Add a migration that drops the OAuth provider tables (root ADR 0011), delete `docs/user/ai-assistants.md`, and supersede root ADR 0012 and Identity ADR 0002.

### HttpApi and OpenAPI

- [ ] Declare the health check, sign-in methods and the MCP client directory as RPCs first, with their RPC clients in `packages/client-runtime/src/`.
- [ ] Delete `packages/domain/src/*/*.http-api.ts`, `packages/domain/src/api.ts`, `apps/api/src/http/` and the HTTP auth middleware.
- [ ] Delete the `HttpApi` clients (`packages/client-runtime/src/*/*-http-client.ts` and the other `*Http*Layer`s), and provide the RPC ones in `apps/web/src/runtime.ts` and `apps/mobile/src/runtime.ts`. Drop the `VITE_TODOS_TRANSPORT` switch.
- [ ] Drop `openapi` from the CLI and point `health` at the RPC.
- [ ] Supersede root ADR 0005 with a new ADR.

### The CLI

- [ ] Delete `apps/cli/` and its entry in the `run-only-in-entry-points` and `layer-config-only-in-roots` options in `tools/oxlint/lint.config.ts`.
- [ ] Apply migrations another way, locally in the `migrate` step of `scripts/dev.mjs` (for example with `psql`) and in production in the `deploy` script in `package.json`, and drop the root `cli` script. Tests are unaffected: `pg-test.ts` applies the files itself.

### i18n

- [ ] Remove Paraglide from `apps/web` (its Vite plugin, `messages/`, `project.inlang`, the generated folder and its lines in `.gitignore`, `vite.config.ts`, `tools/oxlint/lint.config.ts` and `scripts/suppressions.mjs`) and replace `m.*()` calls with literal strings.

### Authentication

- [ ] Delete `packages/auth/`, `packages/domain/src/identity/`, and `packages/client-runtime/src/identity/` and `session/`.
- [ ] Remove `.middleware(…)` from every `HttpApiGroup` and `RpcGroup`, and stop reading `CurrentUser` in handlers; Todos would then need a new ownership rule (Todos ADR 0001).
- [ ] Remove `@boberstack/auth` and `@alchemy.run/better-auth` from `apps/api/package.json`, `packages/auth` from `apps/api/tsconfig.json`, and the better-auth wiring from `apps/api/src/app.layer.ts`, `apps/api/src/server.ts` and `apps/infra/src/worker.ts`.
- [ ] Add a migration that drops the better-auth tables.
- [ ] Delete the sign-in features and route guards of `apps/web` and `apps/mobile`, `docs/internals/identity/`, `docs/user/sign-in.md` and `.agents/skills/verify-web/features/auth.md`.

### The web app

The desktop app serves the web app's build (root ADR 0008), so cutting the web app cuts the desktop app too.

- [ ] Delete `apps/web/`, its reference in the root `tsconfig.json`, its entry in `knip.json`, and the `apps/web` overrides in `tools/oxlint/lint.config.ts` (the `react` plugin scope and `feature-boundaries`), `vite.config.ts`, `scripts/suppressions.mjs` and `.gitignore`.
- [ ] Drop `WEB_ROOT` and the web stage of `apps/infra/api.Dockerfile`, and `assets` from the Worker in `apps/infra/src/worker.ts`. The api then answers `/api/*` and `/.well-known/*` only.
- [ ] In `scripts/dev.mjs`, drop the `web` child and its health check and point the mobile app's `EXPO_PUBLIC_API_URL` at the api URL. In `scripts/dev-ports.mjs`, drop the `web` port and point `AUTH_BASE_URL` at the api. Remove `DEV_WEB_PORT` from `.env.schema`.
- [ ] Delete `scripts/web-boot.mjs`, the `check:web-boot` script and its step in `.github/workflows/ci.yml`, the `browser` script and the `agent-browser` devDependency.
- [ ] Delete the `verify-web` skill (`.agents/skills/verify-web/` and its link in `.claude/skills/`). Move its launch step into `verify-mobile`, which borrows it, and replace its mentions in `AGENTS.md`, the playbook and principle skills and `.github/pull_request_template.md` with `verify-mobile`, or with a request against the api when no client is left.
- [ ] The mobile app imports `@boberstack/ui/beaver`. If it stays, keep what it imports from `packages/ui` and delete the web-only rest (the styles and the shadcn components); otherwise delete `packages/ui/` with its lint scope.
- [ ] Rewrite the web lines in `docs/operations/development.md` and `deploy.md`, and supersede root ADRs whose decision no longer holds.

### The desktop app

- [ ] Delete `apps/desktop/`, its reference in the root `tsconfig.json`, and its entries in `tools/oxlint/lint.config.ts` (the `layer-config-only-in-roots` and `run-only-in-entry-points` allow lists and the two overrides that list `apps/desktop/**`).
- [ ] Remove the `desktop` task from `scripts/dev.mjs`, the root `dev:desktop` script and the `DESKTOP_*` variables in `.env.schema`.
- [ ] Delete the "Desktop app" section of `docs/operations/development.md`, the desktop rows in `AGENTS.md`, and the desktop lines in `tools/oxlint/boberstack/effect/README.md` and in references 07, 10 and 13 of the `effect-best-practices` skill. `docs/operations/mobile.md` takes the app icon from `apps/desktop/resources/icon.png`: name another source.
- [ ] Mark root ADR 0008 superseded.

### The mobile app

- [ ] Delete `apps/mobile/`, its reference in the root `tsconfig.json`, the `apps/mobile` overrides in `tools/oxlint/lint.config.ts` and `vite.config.ts`, and its lines in `.gitignore`.
- [ ] Remove the `mobile` task from `scripts/dev.mjs`, the `metro` port from `scripts/dev-ports.mjs`, the root `dev:mobile` script and the mobile variables in `.env.schema`.
- [ ] Remove `expo()` and the app schemes from `packages/auth/src/better-auth.ts`, and `@better-auth/expo` from `packages/auth/package.json`.
- [ ] Delete `docs/operations/mobile.md` and mark root ADR 0009 superseded.
- [ ] Delete the `verify-mobile` skill (`.agents/skills/verify-mobile/` and its link in `.claude/skills/`), the `agent-device` devDependency and the root `device` script, the `@boberstack/frontend/accessible-controls` rule in `tools/oxlint/`, and the `verify-mobile` lines in `AGENTS.md` and the playbook skills.

## 7. Hosting

Do what the owner chose in step 1. The template ships two hosts; the project keeps one.

Container (not decided, only locally, a server of their own, a cloud that runs containers):

- [ ] Delete `apps/infra/cloudflare.run.ts`, `apps/infra/src/`, the `*:cloudflare` scripts and `@alchemy.run/cloudflare` in `apps/infra/package.json`, `@alchemy.run/cloudflare` in the `pnpm-workspace.yaml` catalog and `workerd` in its `allowBuilds`, `cloudflare.run.ts` and `src` in `apps/infra/tsconfig.json`, `cloudflare.run.ts` in `knip.json`, and `apps/infra/src/worker.ts` in the `layer-config-only-in-roots` allow list of `tools/oxlint/lint.config.ts` and its rule defaults in `tools/oxlint/boberstack/effect/rules/`.
- [ ] Delete the Cloudflare section of `docs/operations/deploy.md`, and the line about workerd in root ADR 0013's consequences.
- [ ] A server of their own: walk the owner through `docs/operations/deploy.md`. The first `pnpm run deploy` waits for the owner's yes (`AGENTS.md`).
- [ ] A cloud: build it after step 9 as its own change, with the `playbook-feature` skill, before or after the owner's first request as they prefer. The new resource replaces `Docker.Container` in the same change, so the project always has a deploy that works.

Cloudflare:

- [ ] `git mv apps/infra/cloudflare.run.ts apps/infra/alchemy.run.ts`. In `apps/infra/package.json`, make `dev`, `deploy` and `destroy` the Cloudflare commands without the file argument, delete the `*:cloudflare` scripts, and remove `@alchemy.run/docker` here and in the catalog.
- [ ] Delete `apps/api/src/server.ts`, `apps/infra/api.Dockerfile`, `.dockerignore`, the `dev` and `start` scripts and `@effect/platform-node` and `@effect/sql-pg` in `apps/api/package.json`, and `Auth.layerConfig` in `packages/auth/src/better-auth.ts`.
- [ ] Remove `PORT`, `WEB_ROOT`, `AUTH_SECRET`, `DEPLOY_DOCKER_HOST` and `API_PORT` from `.env.schema`, and `PORT` and `AUTH_SECRET` from `scripts/dev-ports.mjs`.
- [ ] Remove `apps/api/src/server.ts` from the allow lists of `tools/oxlint/lint.config.ts` and the rule defaults; `apps/infra/src/worker.ts` stays in `layer-config-only-in-roots`.
- [ ] Delete the container section of `docs/operations/deploy.md`, and write an ADR that supersedes root ADR 0013 with the Worker as the only host.
- [ ] Walk the owner through the Cloudflare section of `docs/operations/deploy.md`: connect the account, set `DATABASE_URL`, add a mail transport. The first `pnpm run deploy` waits for the owner's yes (`AGENTS.md`).

Mail, on either host:

- [ ] When the owner named a provider, build its `Mailer` adapter after step 9 as its own change, with the `playbook-feature` skill, the way root ADR 0006 describes. Otherwise note in the README that a mail transport is needed before the first deploy.

## 8. Write the project's own words

- [ ] Rewrite the "Project thesis" section of `AGENTS.md` for this project.
- [ ] Rewrite `README.md` for this project: what it is, the quickstart for the parts that stayed, how to deploy to the hosting from step 1, and the "Origin" section from step 9. Drop the beaver, the template's pitch and its "Make it yours" section.
- [ ] Rewrite `docs/user/` for the product, and the `docs/README.md` index to match what is left.

## 9. Remove the setup and leave a trail

The project no longer needs the template's setup tools. Leave a note that says where it came from, so a part cut today can come back later.

Add this section to the end of `README.md`, with the commit and date from step 2 and the parts you cut:

```md
## Origin

This project started from the template at https://github.com/patryksztuczka/boberstack, commit [`<sha>`](https://github.com/patryksztuczka/boberstack/tree/<sha>), on <date>.

Setup cut <the parts, such as the web app, the desktop app and the todos example, or "nothing">. To cut a part later or bring one back, read its section in the template's [keep-or-cut skill](https://github.com/patryksztuczka/boberstack/blob/<sha>/.agents/skills/keep-or-cut/SKILL.md): it lists every file and line the part touches. To bring a part back, copy those from the template, then compare with the template's latest `master` for newer versions.
```

Then:

- [ ] In `AGENTS.md`, replace the line that sends agents to this skill with: `- This project started from a template. To bring back a part cut at setup, or to compare with the template, read the "Origin" section of the README.`
- [ ] Delete `scripts/init.mjs`, the `init:project` script in `package.json` and its row in `AGENTS.md`.
- [ ] Delete this skill: `.agents/skills/keep-or-cut/` and the link `.claude/skills/keep-or-cut`.
- [ ] `grep -rn keep-or-cut .` must print only the README's "Origin" section. Point every other link at the skill's upstream copy at `<sha>`, or drop it.
- [ ] Run `pnpm verify` and `pnpm test:integration`, then commit, such as `chore: finish setting up the project from the template`.

Then report to the owner: the name, what you kept and cut, the upstream commit, and the "Needs sign-off" list. Go on with the task they asked for.
