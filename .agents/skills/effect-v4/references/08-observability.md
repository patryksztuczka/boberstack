# 08 · Observability

When a request fails, someone has to see why. Spans and structured logs come almost for free when every service method is traced by construction.

## Rules

### obs.spans: service methods are `Effect.fn`

`Effect.fn("Name")` creates a span for every call and captures a stack frame at the call site. Use it for every service method and exported workflow. Use `Effect.fnUntraced` in hot inner loops and for helpers that are not a useful tracing boundary. A store adapter's operations carry no span of their own ([05](05-project-structure.md)).

```ts
// good
const create = Effect.fn("TodosService.create")(function* (owner: UserId, input: NewTodo) {
  yield* Effect.annotateCurrentSpan({ "user.id": owner });
  // …
});

// bad: no span, no call-site frame
const create = (owner: UserId, input: NewTodo) =>
  Effect.gen(function* () {
    /* … */
  });
```

Extra arguments to `Effect.fn` act like `pipe`. Do not call `.pipe` on the resulting function. Declare the return type with `Effect.fn.Return<A, E>` when inference is not enough.

### obs.names: the span name is `<ServiceClass>.<method>`

```ts
Effect.fn("TodosService.list");
Effect.fn("TodosService.update");
```

The name is a string literal (`@boberstack/effect/effect-fn-name`, which can autofix it).

### obs.logs: constant message, structured fields

```ts
// good
yield * Effect.logInfo("Todo created", { todoId: todo.id, owner });

// bad: cannot be grouped or filtered
yield * Effect.logInfo("Created todo " + todo.id + " for " + owner);
```

The first argument is a literal (`@boberstack/effect/log-literal-message`). Loggers are installed as a set, and the minimum level is a reference:

```ts
Logger.layer([Logger.consoleJson, Logger.tracerLogger]);
Layer.succeed(References.MinimumLogLevel, "Info");
```

On the Worker, `console` output lands in Cloudflare Workers Logs, so `Logger.consoleJson` gives one searchable JSON line per log.

### obs.errors: report at the boundary, once

Failures reach an `ErrorReporter` (`import { ErrorReporter } from "effect"`) at the HTTP server's built-in reporting boundary, or where `Effect.withErrorReporting` marks one. To send errors to a vendor, install one reporter layer in the composition root. Do not add `Effect.tapError(…)` reporting calls along the way: they duplicate reports and miss defects.

## Metrics

Metrics are not callable. Use `Metric.update`, `Metric.withAttributes` and `Effect.trackDuration`. OTLP export lives in `effect/observability` when you need it.

Source: `effect/AGENTS.md` (Using Effect.fn), `ai-docs/src/08_observability/`, `effect/src/Logger.ts`, `References.ts`, `ErrorReporter.ts`.
