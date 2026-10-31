# Local development

You need Node 26.13.0 (`.node-version`), pnpm 11.28.9 and Docker.

## Start the stack

```sh
pnpm install     # also installs the Git hooks
pnpm dev         # Postgres and Mailpit in Docker, migrations, the api Worker via alchemy dev, the web app via vp dev
pnpm dev:doctor  # in a second terminal: checks the stack and creates and verifies demo@example.com / demo12345
```

`pnpm dev` prints the URLs. Open the web URL, sign in as the demo user and add a todo. The CLI's `db migrate` command applies `apps/api/migrations/` to the local database on every start.

Ports come from a hash of the checkout path, so two worktrees can run `pnpm dev` at once. Each checkout gets its own Compose project, database and Mailpit inbox. [AGENTS.md](../../AGENTS.md#commands) lists where the state and logs live and the variables that override the ports.

`pnpm dev:status` shows what is running, `pnpm dev:stop` stops it, and `pnpm db:down` also stops this checkout's Postgres.

## Mail

Every mail the app sends locally, such as the account confirmation and the password reset, lands in Mailpit at the `mail` URL `pnpm dev` prints. Nothing leaves your machine (root ADR 0008).

## Environment

[`.env.schema`](../../.env.schema) declares every variable. Put local values in `.env.local`, which Git ignores, and run `pnpm env:check` to validate them.

To try GitHub or Google sign-in, create an OAuth app with the provider and set its callback URL to `<web URL>/api/auth/callback/github` (or `/google`). Put `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, or the `GOOGLE_` pair, in `.env.local`. Without them the buttons do not appear.

## Before you push

`pnpm check:changed` checks the files you touched. `pnpm verify` runs what CI runs, and the pre-push hook runs it too. Add `pnpm test:integration` when you touched SQL, migrations, auth or an endpoint.
