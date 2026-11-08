# Deploy

Alchemy deploys the stack in `apps/infra/alchemy.run.ts` to your own Cloudflare account. The database is any Postgres the Worker can reach over the internet, such as Neon, Supabase or RDS. The stack does not create it (root ADR 0013).

## Connect Cloudflare

Once per machine, add the provider to an Alchemy profile:

```sh
pnpm --filter @boberstack/infra exec alchemy profile edit --add Cloudflare
```

In CI, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` instead.

## Point it at a database

Create a Postgres database with your provider and put its connection string in `.env.production.local`, which is gitignored:

```sh
DATABASE_URL=postgres://user:password@host:5432/app
```

In CI, set `DATABASE_URL` as a secret instead. `pnpm env:check` with `APP_ENV=production` fails while it is missing.

## Deploy

```sh
pnpm run deploy      # plain `pnpm deploy` is a pnpm built-in
```

The deploy builds every package, applies `packages/database/migrations/` to `DATABASE_URL` with `cli db migrate` (root ADR 0014), then runs `alchemy deploy`, which creates the Hyperdrive config and uploads the Worker with `apps/web/dist` as its assets. The stack sets secrets such as the better-auth secret. They never go in a committed file.

A deploy to a shared stage, `alchemy destroy`, and a deploy whose plan replaces or deletes a resource need the owner's approval before you run them ([AGENTS.md](../../AGENTS.md#ask-first)).

## Mail transport

Sign-up sends a confirmation link, so a deployed Worker needs a way to send mail. Only Mailpit exists today, and without a real transport the Worker refuses to start. Root ADR 0008 describes how to add Cloudflare Email Service or Resend and set `MAIL_TRANSPORT`.
