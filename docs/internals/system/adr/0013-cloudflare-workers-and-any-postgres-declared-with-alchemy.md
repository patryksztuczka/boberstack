# Cloudflare Workers and any Postgres, declared with Alchemy

**Status:** superseded by root ADR 0016, 2026-11-09.

Root ADR 0003 put the data in a Neon project that the Alchemy stack created. boberstack is a template that nobody deploys as is, so every project started from it had to open a Neon account before its first deploy, and the stack carried a Neon provider, an API key and a second migration path for that one database.

The api still runs as one Cloudflare Worker that serves the built SPA as static assets, so browser and api share an origin and need no CORS. The Worker reaches Postgres through Cloudflare Hyperdrive, which pools the connections a Worker cannot keep itself. The database is whatever Postgres `DATABASE_URL` names: Neon, Supabase, RDS or a server of your own, created outside the stack. The Hyperdrive config, the Worker, its assets, bindings and secrets are one Effect program in `apps/infra/alchemy.run.ts`, deployed with `alchemy deploy`.

Workers give us global deploys in seconds, no servers to patch and a free tier that fits a starter. Plain Postgres keeps tests, local dev and production on the same SQL without tying the template to one vendor. Alchemy keeps infrastructure in TypeScript and Effect, next to the code that uses it.

## Consequences

- A first deploy needs a Postgres the Worker can reach over the internet, and its URL in `DATABASE_URL`. The stack does not create it.
- The api has no long-lived process and no filesystem. Recurring work is a Cron Trigger; work after the response needs `waitUntil`.
- Node-only libraries do not run in the api. They belong in `apps/cli`.
- Alchemy 2 is in beta. Read its source in `node_modules` before using a resource, and pin it with Effect (root ADR 0002).
- Local dev runs the Worker with `alchemy dev` against Postgres in Docker.

## Considered options

- Neon created by the stack (root ADR 0003): one command from nothing to a deployed app, at the cost of a vendor account, a provider and a second migration path for every project.
- A Node server on a VM or container platform: more control, more operations.
- Cloudflare D1: no Postgres, so no shared SQL with the tests and the CLI, and a different migration story.
