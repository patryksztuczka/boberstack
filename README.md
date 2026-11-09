<p align="center">
  <img src="apps/web/src/assets/beaver-animated.svg?v=9451bd7e" width="220" alt="The boberstack beaver: a beaver in an orange hard hat carrying a stack of logs on its shoulder">
</p>

<h1 align="center">boberstack</h1>

<p align="center">
  <strong>Mistakes stop at the dam. </strong><br>
  A starter that helps coding agents write good code and keep your project in shape.
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href=".agents/skills/keep-or-cut/SKILL.md">Keep or cut</a> ·
  <a href="AGENTS.md">AGENTS.md</a> ·
  <a href="docs/README.md">Docs</a>
</p>

## Why a beaver

A beaver does not ask the river to behave; it builds a dam that holds. This starter works the same way. Every rule that a tool can check is a lint rule, a type, an Effect diagnostic, a hook or a CI step, so a mistake fails `pnpm verify` on your machine instead of waiting for a reviewer. Whatever no tool can check is written down once, short, in [AGENTS.md](AGENTS.md).

It ships a working product, not a hello world: a todo list behind sign-in, served over HttpApi and Effect RPC, stored in Postgres, tested against a real database, and a welcome page with the beaver. Each piece shows how that layer is meant to be written, and each one can be cut (see [Keep or cut](.agents/skills/keep-or-cut/SKILL.md#6-keep-or-cut)).

## Stack

- **Effect 4.0.7** on every server surface: `HttpApi`, RPC, CLI, SQL, Schema, Config. Pinned below 4.1.0 because Alchemy 2.0.0-beta.84 needs `effect/Crypto`.
- **A Node server in a container** for the api and the static SPA, one process on one origin. Cloudflare Workers is the alternative host.
- **Any Postgres**: yours in production, Docker locally, Testcontainers in tests.
- **Alchemy 2** (beta): the infrastructure is an Effect program in `apps/infra/alchemy.run.ts`.
- **better-auth** for sign-in, wired through `@alchemy.run/better-auth`.
- **React 19** with React Router, Effect atoms for data (shared with the mobile app), React Hook Form (validated by the same Effect Schemas the api decodes), Tailwind 4, shadcn components and Paraglide for UI strings (English; add a locale in `apps/web/project.inlang`).
- **Vite+ 1.4.0** (`vp`): dev server, build, Vitest, oxlint, oxfmt, task runner and Git hooks.
- **TypeScript 7** with Effect diagnostics, **pnpm 11**, **Node 26**.

## Quickstart

You need Node 26.13.0 (`.node-version`), pnpm 11.28.9 and Docker.

```sh
pnpm install     # also installs the Git hooks
pnpm dev         # Postgres and Mailpit in Docker, migrations, the api and the web app
pnpm dev:doctor  # in a second terminal: checks the stack and creates demo@example.com / demo12345
```

Open the web URL `pnpm dev` prints, sign in as the demo user and add a todo. Mail goes to the local Mailpit inbox, and `pnpm verify` runs what CI runs. [Local development](docs/operations/development.md) covers ports, mail, environment variables and social sign-in.

## Deploy

```sh
pnpm build
pnpm run deploy      # alchemy deploy; plain `pnpm deploy` is a pnpm built-in
```

One Alchemy stack builds the api image and runs it on a Docker host, this machine or a server over SSH, against a Postgres you bring. Point `DATABASE_URL` at the database and add a mail transport first. [Deploy](docs/operations/deploy.md) covers that and the Cloudflare host.

## Make it yours

Create a repository from the template and ask your agent for the first thing you want built. `AGENTS.md` sends it to the [`keep-or-cut` skill](.agents/skills/keep-or-cut/SKILL.md) first. The agent asks what you are building, explains each part, whether the api should speak HttpApi, RPC or both, and where it will run. It renames the project, cuts the parts you will not use (the web, desktop or mobile app, todos, auth, RPC, MCP, the CLI, i18n), and applies the GitHub settings. Not sure yet what you need? Then it only renames the project and cuts nothing. Then it adds an "Origin" section to the README naming the template commit you started from, deletes the skill, and goes on with your request.

A part you cut can come back later: the skill at that template commit lists every file and line the part touches. Without an agent, follow the skill by hand.

## License

Add your own before you publish.
