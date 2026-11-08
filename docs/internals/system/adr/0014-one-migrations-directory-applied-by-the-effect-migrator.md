# One migrations directory, applied by the Effect migrator everywhere

**Status:** accepted, 2026-11-08.

Root ADR 0006 applied the migrations with two runners: Neon's at deploy, which records them in `__alchemy_migrations`, and Effect's `Migrator` locally and in tests, which records them in `effect_sql_migrations`. Two bookkeeping tables could disagree about what a database has, and the local runner must never touch a database the deploy runner owns. Root ADR 0013 removed Neon from the stack, and with it the reason for a second runner.

Every table, ours and better-auth's, is created by plain SQL files in `packages/database/migrations/`, named `NNNN_name.sql` and applied in order by one runner: `cli db migrate`, which is `Migrator` over `sqlFileMigrations`. `pnpm run deploy` runs it against the production `DATABASE_URL` before `alchemy deploy`; `pnpm dev` runs it against the checkout's Docker Postgres; the Testcontainers Postgres layer runs it before any suite. `@alchemy.run/better-auth`'s own deploy-time migration is turned off.

## Consequences

- A migration is append-only. Never edit or renumber one that has been applied anywhere; write the next one.
- Migrations run before the new Worker is uploaded, so a migration must keep the running Worker working: add first, drop in a later deploy.
- Upgrading better-auth means comparing its schema with ours and writing the migration by hand.
- A destructive migration needs owner sign-off (AGENTS.md).

## Considered options

- Migrations as TypeScript files run by the same `Migrator`: allow data migrations with logic, but the SQL is no longer a plain file to review. Worth revisiting with the first migration that needs logic.
- better-auth's generator for auth tables and our files for the rest: two sources of schema truth.
- An ORM's migration tool: rejected with the ORM (root ADR 0004).
