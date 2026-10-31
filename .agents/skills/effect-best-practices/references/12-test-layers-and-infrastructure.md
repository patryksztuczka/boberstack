# 12 · Test layers and infrastructure

Test layers inject failures or replace systems Postgres cannot stand in for. Database-backed suites use a real PostgreSQL in a disposable Testcontainers container and cannot reach a development or production database. Why no in-memory store: root ADR 0004.

## Rules

### tl.mocks: `Layer.mock` scenarios in the test file

Tests compose `Service.layer` (or `layerNoDeps`) with `Layer.mock` scenarios defined in the test file. Methods left out of a mock die with an unimplemented defect if called, so a mock only needs what the scenario uses. A `layerTest` static exists only when several test files share the same default, and never on a `*Store` (`@boberstack/effect/no-store-fakes`).

```ts
// good: the scenario is visible in the test file
const StoreDown = Layer.mock(TodoStore, {
  listByOwner: () => Effect.fail(new TodoStorageError({ operation: "listByOwner", cause: "down" })),
});

// bad: bypasses dependency injection and breaks silently on renames
vi.mock("../todos/todo.store.ts", () => ({/* … */}));
```

### tl.postgres: one real Postgres per test run

`apps/api/src/testing/pg-test.ts` starts one `postgres` container per `pnpm test:integration` run, never one per test or per file, and applies every file in `apps/api/migrations/` in order. The tables tests see are the tables production has (root ADR 0006). The container is a scoped resource: `Effect.acquireRelease` starts it and stops it.

```ts
export class PgTestStartError extends Schema.TaggedError<
  PgTestStartError,
  { readonly brand: unique symbol }
>()("PgTestStartError", { cause: Schema.Defect() }) {}

const container =
  yield *
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => new PostgreSqlContainer("postgres:17-alpine").start(),
      catch: (cause) => new PgTestStartError({ cause }),
    }),
    (started) => Effect.promise(() => started.stop()),
  );
```

Integration files end in `.integration.test.ts` and need Docker. CI runs them as its last stage on every pull request and push to `master`.

### tl.isolation: one database per test file

Each integration file gets its own database, created from the migrated template and dropped when the file's suite ends, so files run in parallel and the code under test can commit and use its own pool. Postgres copies a template only while no one is connected to it, so clones are created one at a time.

```ts
layer(TodoRepository.layer.pipe(Layer.provide(PgTest.layer)))("TodoRepository", (it) => {
  it.effect("lists a user's todos oldest first", () => /* … */);
});
```

### tl.safety: a test cannot reach a real database

It would take three independent failures:

1. **Structural.** The database URL comes only from the container. Tests use `layer(options)`, never `layerConfig` (`@boberstack/effect/layer-config-only-in-roots`).
2. **No environment.** Tests read no `Config`, so a stray `Config.String("DATABASE_URL")` fails with `ConfigError`.
3. **Guard.** `PgTest` refuses any host that is not `localhost` or `127.0.0.1`.

### tl.config: application config in tests

Prefer `Service.layer(options)` with plain values. When a test must go through `layerConfig`, provide `ConfigProvider.layer(ConfigProvider.fromUnknown({ … }))`. Never mutate `process.env`.

Source: `effect/src/Layer.ts` (`mock`), `@effect/vitest` (`layer`), Testcontainers PostgreSQL module, PostgreSQL docs on template databases.
