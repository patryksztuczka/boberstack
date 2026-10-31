# 09 · Concurrency and resources

Fibers are structured. A child cannot outlive its parent unless you say so, and interruption runs finalizers. Stay inside that structure.

## Rules

### conc.parallel: a bounded, named concurrency

`Effect.all` and `Effect.forEach` are sequential by default. For concurrency, pass a number from a named constant. v4 has no ambient concurrency setting.

```ts
// good
const INVITE_CONCURRENCY = 4;
yield * Effect.forEach(emails, invite, { concurrency: INVITE_CONCURRENCY });

// bad: unbounded load on the database
yield * Effect.forEach(emails, invite, { concurrency: "unbounded" });

// bad: no interruption, no limit, loses services
await Promise.all(emails.map((email) => Effect.runPromise(invite(email))));
```

A Worker request holds few connections. Through Hyperdrive, keep database fan-out inside one request at a single-digit concurrency. This rule is reviewed, not linted.

### conc.background: background fibers belong to a scope

Use `Effect.forkChild` for work the parent waits on, and `Effect.forkScoped`, `FiberSet`, `FiberMap` or `FiberHandle` for work that lives as long as a layer. Everything is interrupted on shutdown. `Effect.forkDetach` escapes the scope, so shutdown never interrupts it: avoid it. If a fiber really has to outlive its scope, say why in the pull request, and in an ADR when it is a design decision. No lint rule checks this.

```ts
static readonly layer = Layer.effect(
  this,
  Effect.gen(function* () {
    const inflight = yield* FiberSet.make();
    const submit = Effect.fn("Mailer.submit")(function* (message: OutgoingMail) {
      yield* FiberSet.run(inflight, send(message));
    });
    return Mailer.of({ submit });
  }),
);
```

On the Worker, a fiber still running when the response is sent dies with the request. Work that must finish after the response needs the Worker's `waitUntil`, wired once in `worker.ts`.

v4 renames: `Effect.fork` is `Effect.forkChild`, `Effect.forkDaemon` is `Effect.forkDetach`.

### conc.resources: `acquireRelease` inside a layer

A resource with a close method is acquired with `Effect.acquireRelease` inside the layer's `make`. The release runs on shutdown, at the end of a test and on failure.

```ts
const pool =
  yield *
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => connect(url),
      catch: (cause) => new DatabaseUnavailableError({ cause }),
    }),
    (pool) => Effect.promise(() => pool.end()),
  );
```

### conc.callbacks: wrap a callback with `Effect.callback`, never `new Promise`

`new Promise(…)` loses interruption and typed errors (`@boberstack/effect/no-new-promise`). Wrap a callback API with `Effect.callback`, and a Promise API with `Effect.tryPromise`.

## Notes

- `Ref`, `Deferred` and `Fiber` are not yieldable. Use `Ref.get`, `Deferred.await` and `Fiber.join`.
- `Semaphore` is its own module: `Semaphore.make(n)`, `Semaphore.withPermits(semaphore, 1)`.

Source: `effect/src/Effect.ts` (`forkChild`, `forkScoped`, `forkDetach`, `callback`, `acquireRelease`), `FiberSet.ts`, `Semaphore.ts`, `ai-docs/src/01_effect/05_resources/`.
