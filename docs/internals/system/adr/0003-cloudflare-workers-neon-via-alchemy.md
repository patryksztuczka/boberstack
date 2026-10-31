# Cloudflare Workers and Neon, declared with Alchemy

**Status:** accepted, 2026-10-30.

The api runs as one Cloudflare Worker that also serves the built SPA as static assets, so browser and api share an origin and need no CORS. Data lives in Neon Postgres, reached from the Worker through Cloudflare Hyperdrive, which pools connections the Worker cannot keep itself. The whole footprint, the Neon project, the Hyperdrive config, the Worker, its assets, bindings and secrets, is one Effect program in `apps/infra/alchemy.run.ts`, deployed with `alchemy deploy`.

Workers give us global deploys in seconds, no servers to patch and a free tier that fits a starter. Neon gives us real Postgres with branching, so tests, local dev and production run the same SQL. Alchemy keeps infrastructure in TypeScript and Effect, next to the code that uses it, with the same review and the same types; Terraform or the Cloudflare dashboard would be a second language and a second source of truth.

## Consequences

- The api has no long-lived process and no filesystem. Recurring work is a Cron Trigger; work after the response needs `waitUntil`.
- Node-only libraries do not run in the api. They belong in `apps/cli`.
- Alchemy 2 is in beta. Read its source in `node_modules` before using a resource, and pin it with Effect (root ADR 0002).
- Local dev runs the Worker with `alchemy dev` against Postgres in Docker, not against Neon.

## Considered options

- A Node server on a VM or container platform: more control, more operations.
- Cloudflare D1: no Postgres, so no shared SQL with the tests and the CLI, and a different migration story.
