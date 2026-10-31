# SQL only in repositories, and stores tested on real Postgres

**Status:** accepted, 2026-10-30.

A domain module that keeps state declares a store port, `XStore` in `x.store.ts`. The SQL behind it lives in one place, `XRepository` in `apps/api/src/platform/database/x.repository.ts`, and nowhere else. A store has exactly one implementation: there is no in-memory fake and no `layerTest` on a `*Store`. Its contract runs on a real Postgres started by Testcontainers, migrated from the same files production uses.

An in-memory fake has to reimplement ordering, uniqueness, constraints, transactions and races, and it gets them subtly wrong. Tests then pass against the fake and fail against the database, and every behaviour is maintained twice. Keeping SQL in one folder means a schema change has one place to land, and a domain module stays testable with `Layer.mock` for the single failures Postgres cannot produce on demand.

## Consequences

- Lint enforces both halves: `@boberstack/effect/no-domain-sql` keeps SQL and database imports out of modules, `@boberstack/effect/no-store-fakes` refuses a store fake.
- Integration tests need Docker and run as their own CI stage, after the build.
- A service test that needs stored state is an integration test.

## Considered options

- An ORM: hides the SQL we want to review and adds a schema definition parallel to the migrations.
- In-memory fakes for fast unit tests: rejected for the drift described above.
