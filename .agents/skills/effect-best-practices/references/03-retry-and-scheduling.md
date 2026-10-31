# 03 · Retry and scheduling

Retrying, backing off, timing out and running on a schedule are solved problems in Effect. A `Schedule` is a value, so `TestClock` can drive it.

## Rules

### retry.while: retry inline, and only transient errors

Declare a retry at the call site with `Effect.retry({ schedule, times, while })`. Retry only the failures you name as transient, so every retry has a `while` or `until` (`@boberstack/effect/retry-requires-while`).

```ts
// good
const todos =
  yield *
  store.list(owner).pipe(
    Effect.retry({
      schedule: Schedule.exponential("100 millis"),
      times: 3,
      while: Predicate.isTagged("TodoStorageError"),
    }),
  );

// bad: retries TodoNotFoundError and validation failures too
effect.pipe(Effect.retry({ times: 5 }));

// bad: not interruptible, invisible to TestClock, loses the error type
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    return await fetchTodos();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
  }
}
```

Use `Predicate.isTagged("…")` for the predicate, not `e._tag === "…"` (`anti-slop-effect/no-manual-tag-comparison`).

`Effect.retry` always runs the effect once first, so `times: 3` means up to three retries. Defects and interruptions are never retried.

v4 renamed several `Schedule` combinators: `union` is `Schedule.min([…])`, `intersect` is `Schedule.max([…])`, `andThen` is `concat`, `whileInput` is `while`.

### retry.timeout: every external call has a timeout

A call to another system gets `Effect.timeout`. It adds `Cause.TimeoutError` to E, which the caller maps to the module's error.

```ts
yield * client.send(request).pipe(Effect.timeout("5 seconds"));
```

A Worker request has a CPU and wall-clock budget set by Cloudflare. A timeout shorter than that budget turns a hang into a typed failure instead of a killed isolate.

## Scheduled work

### jobs.where: a Worker has no background loop

A Cloudflare Worker lives for one event. `Effect.repeat(Schedule.spaced(…))` inside the api Worker stops when the request ends, so recurring work is a Cron Trigger declared in the Alchemy stack (`apps/infra/alchemy.run.ts`), handled by the Worker as a scheduled event. On Node (`apps/cli`), an in-process `Layer.effectDiscard(work.pipe(Effect.repeat(…), Effect.forkScoped))` is fine.

### jobs.shape: a job is `run(period)`; the entry point picks the period

The scheduled handler computes the period it is responsible for from the Clock, then calls one service method. The service never reads the trigger's timestamp.

### jobs.idempotency: a job claims `<job>/<period>` before working

Cron Triggers fire at least once and a failed run is retried by hand, so a job must be safe to run twice for the same period. Claim the key with one statement its constraint decides (`INSERT … ON CONFLICT DO NOTHING RETURNING`) in the job's store, skip a period already completed, and give a run stuck in `running` a staleness timeout.

Source: `effect/src/Effect.ts` (`retry`, `timeout`), `Schedule.ts`, `Predicate.ts` (`isTagged`).
