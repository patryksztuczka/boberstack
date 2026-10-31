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
  <a href="docs/operations/make-it-yours.md#keep-or-cut">Keep or cut</a> ·
  <a href="AGENTS.md">AGENTS.md</a> ·
  <a href="docs/README.md">Docs</a>
</p>

## Why a beaver

A beaver does not ask the river to behave; it builds a dam that holds. This starter works the same way. Every rule that a tool can check is a lint rule, a type, an Effect diagnostic, a hook or a CI step, so a mistake fails `pnpm verify` on your machine instead of waiting for a reviewer. Whatever no tool can check is written down once, short, in [AGENTS.md](AGENTS.md).

It ships a working product, not a hello world: a todo list behind sign-in, served over HttpApi and Effect RPC, stored in Postgres, tested against a real database, and a welcome page with the beaver. Each piece shows how that layer is meant to be written, and each one can be cut (see [Keep or cut](docs/operations/make-it-yours.md#keep-or-cut)).

## Stack

- **Effect 4.0.7** on every server surface: `HttpApi`, RPC, CLI, SQL, Schema, Config. Pinned below 4.1.0 because Alchemy 2.0.0-beta.84 needs `effect/Crypto`.
- **Cloudflare Workers** for the api and the static SPA, one Worker on one origin.
- **Neon Postgres** through Hyperdrive in production, Postgres in Docker locally, Testcontainers in tests.
- **Alchemy 2** (beta): the infrastructure is an Effect program in `apps/infra/alchemy.run.ts`.
- **better-auth** for sign-in, wired through `@alchemy.run/better-auth`.
- **React 19** with React Router, TanStack Query, React Hook Form (validated by the same Effect Schemas the api decodes), Tailwind 4, shadcn components and Paraglide for UI strings (English; add a locale in `apps/web/project.inlang`).
- **Vite+ 1.4.0** (`vp`): dev server, build, Vitest, oxlint, oxfmt, task runner and Git hooks.
- **TypeScript 7** with Effect diagnostics, **pnpm 11**, **Node 26**.

## Quickstart

You need Node 26.13.0 (`.node-version`), pnpm 11.28.9 and Docker.

```sh
pnpm install     # also installs the Git hooks
pnpm dev         # Postgres and Mailpit in Docker, migrations, the api Worker and the web app
pnpm dev:doctor  # in a second terminal: checks the stack and creates demo@example.com / demo12345
```

Open the web URL `pnpm dev` prints, sign in as the demo user and add a todo. Mail goes to the local Mailpit inbox, and `pnpm verify` runs what CI runs. [Local development](docs/operations/development.md) covers ports, mail, environment variables and social sign-in.

## Deploy

```sh
pnpm build
pnpm run deploy      # alchemy deploy; plain `pnpm deploy` is a pnpm built-in
```

One Alchemy stack deploys to your own Cloudflare and Neon accounts. Connect the accounts and add a mail transport first: [Deploy](docs/operations/deploy.md).

## Make it yours

```sh
pnpm init:project -- --name acme-shop --scope @acme
```

Then cut what you will not use. [Make it yours](docs/operations/make-it-yours.md) has a checklist for each part: the welcome page, todos, RPC, HttpApi, the CLI, i18n, authentication and the web app.

## License

Add your own before you publish.
