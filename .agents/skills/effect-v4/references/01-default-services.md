# 01 · Default services

Effect gives every program five services for free: Clock, Random, Console, ConfigProvider and Tracer. Each is a `Context.Reference` with a live default, so using one adds nothing to `R`, and the test kit controls each of them. Use them instead of the globals, and never write a replacement.

## What replaces what

| Instead of                          | Use                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `Date.now()`, `new Date()`          | `yield* DateTime.now` for a timestamp, `yield* Clock.monotonicTimeNanos` for a duration |
| `Math.random()`                     | `yield* Random.next`, `Random.nextIntBetween`, `Random.shuffle`                         |
| `crypto.randomUUID()`, random bytes | the `Crypto.Crypto` service: `randomUUIDv7()`, `randomUUIDv4()`, `randomBytes(n)`       |
| `console.log`                       | `yield* Effect.logInfo("Constant message", { fields })` ([08](08-observability.md))     |
| `setTimeout`, `setInterval`         | `Effect.sleep`, `Effect.repeat(Schedule…)`                                              |
| `process.env.X`, the Worker `env`   | `yield* Config.String("X")`, inside a `layerConfig` only ([07](07-configuration.md))    |

## Rules

### defaults.time: time comes from the Clock

A timestamp comes from `DateTime.now`; a duration uses `Clock.monotonicTimeNanos`. `DateTime.nowUnsafe` calls `Date.now()` behind the Clock's back, so `TestClock` cannot move it. `@boberstack/effect/no-ambient-date` flags `new Date()` and `Date()` without arguments.

```ts
const create = Effect.fn("TodosService.create")(function* (owner: UserId, input: NewTodo) {
  const createdAt = yield* DateTime.now;
  return yield* store.insert({ owner, title: input.title, createdAt });
});
```

Do not wrap the clock in a service of your own, such as a `TimeProvider`. `Effect.sleep`, `Schedule`, `Effect.timeout` and `TestClock` all read `Clock` and would not see it.

### defaults.random: ids and secrets come from `Crypto`

`Random` is seedable and not cryptographically secure: use it for jitter, sampling and shuffles. An id or a token comes from the `Crypto.Crypto` service (`import { Crypto } from "effect"`). Unlike `Random`, it is not a default service, so the composition root provides it: `NodeServices.layer` includes it on Node, and on the Worker and in the browser `platform/` builds it once with `Crypto.make` over Web Crypto. `randomUUIDv7()` sorts by creation time, which suits primary keys; never use it as a secret. Its methods fail with `PlatformError`, which a service maps to its own error or treats as a defect.

```ts
import { Crypto } from "effect";

const crypto = yield * Crypto.Crypto;
const id = TodoId.make(yield * crypto.randomUUIDv7().pipe(Effect.orDie));
```

Capture `Crypto` in the service's `make`, like any other dependency ([04](04-services-and-layers.md)). Tests that need predictable ids use `TestCrypto` from `effect/testing`.

### defaults.globals: no ambient globals in Effect code

Effect code never touches `Date.now`, `Math.random`, `console`, timers, `process.env` or a Worker's `env` object. Exempt: `scripts/**`, tool config files (`vite.config.ts`) and Vitest global setup files. Entry points follow every rule; with `runMain` and `Config` they need no exemption.

### defaults.tests: tests control time and randomness

`it.effect` provides `TestClock`, starting at 0. Move it with `TestClock.adjust`. Tests that depend on randomness pin `Random.withSeed`.

```ts
import { assert, it } from "@effect/vitest";
import { Effect, Fiber, Random } from "effect";
import { TestClock } from "effect/testing";

it.effect("gives up after five seconds", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(Effect.flip(slowCall.pipe(Effect.timeout("5 seconds"))));
    yield* TestClock.adjust("5 seconds");
    const error = yield* Fiber.join(fiber);
    assert.strictEqual(error._tag, "TimeoutError");
  }).pipe(Random.withSeed("timeout-test")),
);
```

Never `vi.useFakeTimers()`. It patches globals behind Effect's back.

## Overriding a default service

v4 removed `DefaultServices`, `Effect.withClock`, `withRandom`, `withConsole` and `Layer.setClock`. Override with:

```ts
program.pipe(Effect.provideService(Clock.Clock, customClock));
Layer.succeed(Clock.Clock, customClock);
```

Tests rarely need more than `TestClock` and `Random.withSeed`.

Source: `effect/src/Clock.ts`, `Random.ts`, `DateTime.ts`, `Crypto.ts`, `testing/TestClock.ts`, `testing/TestCrypto.ts` in `effect@4.0.7`.
