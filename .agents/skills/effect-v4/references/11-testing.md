# 11 · Testing

Write fewer tests with higher fidelity, at the seams. Tests call public service APIs the way production does. A test that checks the implementation instead of the behaviour, or that restates the code, is a cost with no benefit.

Effect tests import from `@effect/vitest`; plain tests import from `vite-plus/test`. Both run under `vp test`.

## Rules

### test.harness: `@effect/vitest`, one suite per scenario

`it.effect` gives each test a fresh `Scope`, a `TestClock` starting at 0 and a `TestConsole`. Each mock scenario is its own `layer(…)` suite, named after the scenario.

```ts
import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";

const StoreDown = Layer.mock(TodoStore, {
  listByOwner: () => Effect.fail(new TodoStorageError({ operation: "listByOwner", cause: "down" })),
});

layer(TodosService.layer.pipe(Layer.provide(StoreDown)))(
  "TodosService when the store is down",
  (it) => {
    it.effect("surfaces the storage failure", () =>
      Effect.gen(function* () {
        const todos = yield* TodosService;
        const error = yield* todos.list(Samples.alice).pipe(Effect.flip);
        assert.strictEqual(error._tag, "TodoStorageError");
      }),
    );
  },
);
```

Running an Effect with `Effect.runPromise` inside a test is refused (`@boberstack/effect/run-only-in-entry-points`): there is no TestClock and no scope, and failures turn into promise rejections.

### test.seams: test the seams first

| Seam           | What to test                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Services       | the public API, through `layer` + `Layer.mock` for single failures                                                |
| Stores         | the contract on real Postgres, in the repository's integration suite ([12](12-test-layers-and-infrastructure.md)) |
| Errors         | every tag in a method's signature has a test                                                                      |
| HTTP and RPC   | one integration test per endpoint through the real `AppLayer` on Postgres                                         |
| Layers         | the application layer graph builds with test infrastructure                                                       |
| Pure functions | property tests with `it.prop` over Schemas                                                                        |

```ts
it.prop(
  "a normalized title is never longer than the limit",
  [Schema.String],
  ([raw]) => normalizeTitle(raw).length <= TODO_TITLE_MAX_LENGTH,
);
```

Never `vi.mock` (`anti-slop/no-module-mocking`). Never assert call counts on a fake.

### test.errors: `Effect.flip` and assert on the tag

```ts
// good
const error = yield * todos.update(Samples.alice, missingId, patch).pipe(Effect.flip);
assert.strictEqual(error._tag, "TodoNotFoundError");

// bad: loses the type and passes for any error
await expect(Effect.runPromise(update(missingId))).rejects.toThrow();
```

`assert.deepStrictEqual` compares two errors by `name`, `message` and `code` only, so two errors with one tag and different fields pass. To assert the fields too, compare their spreads: `assert.deepStrictEqual({ ...error }, { ...expected })`.

### test.noTry: no `try` in tests

A `catch` accepts whatever was thrown (`@boberstack/effect/no-try-in-tests`). Assert an Effect's failure with `Effect.flip` or `Effect.exit`, and a pure function's refusal on the `Result` it returns. Restore state with a scoped resource (`Effect.acquireRelease`, a layer), not `finally`.

```ts
const result = parseLimit("0");
assertTrue(Result.isFailure(result));
assert.strictEqual(result.failure._tag, "InvalidLimitError");
```

### test.time: time and randomness

Time-dependent tests use `TestClock.adjust`; random-dependent tests pin `Random.withSeed`. See [01](01-default-services.md).

### test.flaky: no timeouts, sleeps, polling or silent skips

A test that needs more time, a retry or a skip to go green is reporting a bug, in the code or in the test. Fix the wait; do not hide it. The `@boberstack/test-hygiene/*` lint rules enforce this in every `*.test.ts(x)` (see `tools/oxlint/boberstack/test-hygiene/README.md`):

- No per-test timeout, `retry` or `repeats`, not on `it`, `describe`, `layer(…)` or a hook, and no `vi.setConfig`. The timeouts in the package's `vite.config.ts` are the ceiling (the integration project allows 120 s for the Testcontainers start). Every package sets `retry: 0` and `passWithNoTests: false`, and CI refuses `.only`.
- No real-clock waits: no `setTimeout`, `setInterval`, `node:timers/promises` or `sleep(…)` helper. Await what marks the milestone: a `Deferred`, `Queue.take`, a Stream element, `vi.waitFor`, Testing Library's `findBy*`. Under `it.effect`, `Effect.sleep` runs on the TestClock and fires only after `TestClock.adjust`.
- No polling loops (`while (!done) await sleep(10)`, a loop over `Effect.yieldNow`). A fixed-count loop is fine.
- `.skip`, `.todo` and `xit` need a reason on the line above, so a switched-off test shows up in review and in a search:

```ts
// QUARANTINE: #42 Hyperdrive in dev drops the connection after a restart
it.skip("syncs todos", () => {});
```

`describe.skipIf(condition)` and `it.runIf(condition)` are platform gates, not skips, and need no marker.

## v4 notes

- `it.scoped` is gone; use `it.effect`.
- `TestClock` comes from `effect/testing`.
- `it.prop` takes Schemas or Arbitraries; `it.effect.prop` runs an Effect per case.
- Assertion helpers (`assertTrue`, `assertSome`, `assertFailure`) live in `@effect/vitest/utils`.

Source: `@effect/vitest` 4.0.7 `src/index.ts`, `src/utils.ts`; `effect/ai-docs/src/09_testing/`.
