# Deploy

Alchemy deploys the stack in `apps/infra/alchemy.run.ts` to your own Cloudflare and Neon accounts.

## Connect the accounts

Once per machine, add both providers to an Alchemy profile:

```sh
pnpm --filter @boberstack/infra exec alchemy profile edit --add Cloudflare --add Neon
```

In CI, set `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `NEON_API_KEY` instead.

## Deploy

```sh
pnpm build
pnpm run deploy      # alchemy deploy; plain `pnpm deploy` is a pnpm built-in
```

The deploy creates the Neon project, applies `apps/api/migrations/`, creates the Hyperdrive config and uploads the Worker with `apps/web/dist` as its assets. The stack sets secrets such as the better-auth secret. They never go in a committed file.

A deploy to a shared stage, `alchemy destroy`, and a deploy whose plan replaces or deletes a resource need the owner's approval before you run them ([AGENTS.md](../../AGENTS.md#ask-first)).

## Mail transport

Sign-up sends a confirmation link, so a deployed Worker needs a way to send mail. Only Mailpit exists today, and without a real transport the Worker refuses to start. Root ADR 0008 describes how to add Cloudflare Email Service or Resend and set `MAIL_TRANSPORT`.
