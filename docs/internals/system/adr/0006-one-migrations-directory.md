# One migrations directory for app and auth tables

**Status:** accepted, 2026-10-30.

Every table, ours and better-auth's, is created by plain SQL files in `apps/api/migrations/`, named `NNNN_name.sql` and applied in order. The same files are applied in three places: by Neon at deploy, through the Alchemy `Neon.Project` `migrations` option; locally by `cli db migrate`; and in tests by the Testcontainers Postgres layer before any suite runs. `@alchemy.run/better-auth`'s own deploy-time migration is turned off.

Two migration mechanisms would let production, local dev and tests disagree about the schema, and the disagreement would surface as a bug in whichever environment ran the other path. With one directory, a schema change is one reviewed SQL file, and the integration tests prove it against the same SQL production runs.

## Consequences

- A migration is append-only. Never edit or renumber one that has been applied anywhere; write the next one.
- Upgrading better-auth means comparing its schema with ours and writing the migration by hand.
- Bookkeeping differs by runner: Alchemy records applied files in its own `__alchemy_migrations` table on Neon. The local and test runners must apply the same files in the same order and must not be pointed at a Neon database.
- A destructive migration needs owner sign-off (AGENTS.md).

## Considered options

- better-auth's generator and Alchemy's better-auth migration Action for auth tables, our files for the rest: two sources of schema truth.
- An ORM's migration tool: rejected with the ORM (root ADR 0004).
