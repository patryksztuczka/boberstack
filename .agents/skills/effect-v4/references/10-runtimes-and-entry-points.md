# 10 · Runtimes and entry points

An entry point is a file that starts the Effect runtime for a host: a Worker, a process, a browser tab, a deploy. It is where the layer graph meets the outside world, and nothing imports it. Everything else is library code that exports Effects and Layers.

| Host              | Entry point                 | Runs                                                                     |
| ----------------- | --------------------------- | ------------------------------------------------------------------------ |
| Cloudflare Worker | `apps/api/src/worker.ts`    | the api: HttpApi + RPC + better-auth, and the built SPA as static assets |
| Node process      | `apps/cli/src/main.ts`      | `cli db migrate`, `cli openapi`, `cli health` via `NodeRuntime.runMain`  |
| Browser           | `apps/web/src/runtime.ts`   | the one `ManagedRuntime` the React app calls through                     |
| Deploy            | `apps/infra/alchemy.run.ts` | the Alchemy stack: Neon, Hyperdrive, the api Worker                      |

## Rules

### runtime.allowlist: only entry points start runtimes

`Effect.runPromise`, `runSync`, `runFork`, `runCallback`, `NodeRuntime.runMain` and `ManagedRuntime.make` appear only in the four files above (`@boberstack/effect/run-only-in-entry-points`). Adding an entry point is a change to the rule's `allow` list in the root `vite.config.ts`, which needs owner sign-off. Calling `runtime.runPromise(…)` on the existing web runtime is allowed anywhere in `apps/web`: that is the bridge.

Route and handler modules never run effects. They export layers, and the entry point merges them.

### runtime.worker: one Worker, one composition root

`worker.ts` declares the api Worker with Alchemy's `Cloudflare.Worker` and is its composition root: it provides `AppLayer` (routes, modules, platform) and the configured infrastructure, and turns the HttpApi and RPC layers into the Worker's fetch handler. The same Worker serves `apps/web/dist` as static assets with SPA fallback; requests to `/api/*` reach the Worker first. Browser and api share one origin, so there is no CORS setup.

A Worker has no long-lived process: no `Layer.launch`, no background loop ([03](03-retry-and-scheduling.md)), and per-request resources are released when the request's scope closes.

### runtime.cli: `runMain` on Node

```ts
// apps/cli/src/main.ts
program.pipe(Effect.provide(CliLayer), NodeRuntime.runMain);
```

`runMain` turns SIGINT and SIGTERM into interruption, so every finalizer runs, and sets the exit code from the failure (`Runtime.errorExitCode`, [02](02-typed-errors.md)). The CLI reads `process.env` only through `Config`.

### runtime.web: one `ManagedRuntime` for React

```ts
// apps/web/src/runtime.ts
export const runtime = ManagedRuntime.make(WebLayer);

// features/todos/api/use-todos.ts
export const useTodos = () =>
  useQuery({ queryKey: ["todos"], queryFn: () => runtime.runPromise(listTodos) });
```

React, React Router and TanStack Query are hosts that do not run Effect, so they enter through `runtime`. A component never calls `Effect.runPromise` with its own `Effect.provide`: that rebuilds layers per call and never disposes them.

### runtime.bridge: `run*With` for a library that calls back through Promises

Some libraries call back only through Promises: better-auth's database adapter, a driver running a transaction body. Such a callback runs its Effect with `Effect.runPromiseWith(context)`, where `context` is `yield* Effect.context()` captured where the library is called, so the callback keeps the fiber's services. Every use carries a `// BRIDGE: …` comment directly above it naming the library and what it calls back for; the lint rule refuses one without.

```ts
const context = yield * Effect.context<SqlClient.SqlClient>();

// BRIDGE: better-auth calls the session hook through a Promise.
const onSession = (session: Session) => Effect.runPromiseWith(context)(audit.record(session));
```

### runtime.exempt: entry points follow every other rule

With `runMain` and `Config`, entry points need neither `console` nor `process.env`. Only `scripts/**`, tool config files and Vitest global setup files are exempt from the ambient-globals rules ([01](01-default-services.md)).

Source: `effect/AGENTS.md` (Running Effect programs), `ai-docs/src/01_effect/06_running/`, `ManagedRuntime.ts`, `Effect.ts` (`runPromiseWith`), `@effect/platform-node` `NodeRuntime.ts`.
