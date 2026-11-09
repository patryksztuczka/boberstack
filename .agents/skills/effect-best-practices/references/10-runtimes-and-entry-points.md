# 10 · Runtimes and entry points

An entry point is a file that starts the Effect runtime for a host: a server process, a Worker, a browser tab, a deploy. It is where the layer graph meets the outside world, and nothing imports it. Everything else is library code that exports Effects and Layers.

| Host              | Entry point                                                 | Runs                                                                                                     |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Node server       | `apps/api/src/server.ts`                                    | the api: HttpApi + RPC + MCP + better-auth, and the built SPA from `WEB_ROOT`, via `NodeRuntime.runMain` |
| Cloudflare Worker | `apps/infra/src/worker.ts`                                  | the same api on the alternative host, and the built SPA as static assets                                 |
| Node process      | `apps/cli/src/main.ts`                                      | `cli db migrate`, `cli openapi`, `cli health` via `NodeRuntime.runMain`                                  |
| Electron main     | `apps/desktop/src/main.ts`                                  | the desktop window around the web app via `NodeRuntime.runMain` (root ADR 0010)                          |
| Browser, phone    | `apps/web/src/runtime.ts`, `apps/mobile/src/runtime.ts`     | the client layer the shared atoms run on, seeded into the app's `AtomRegistry`                           |
| Deploy            | `apps/infra/alchemy.run.ts`, `apps/infra/cloudflare.run.ts` | the Alchemy stacks: the api image and container, or Hyperdrive and the api Worker                        |

## Rules

### runtime.allowlist: only entry points start runtimes

`Effect.runPromise`, `runSync`, `runFork`, `runCallback`, `NodeRuntime.runMain` and `ManagedRuntime.make` appear only in the files above (`@boberstack/effect/run-only-in-entry-points`). Adding an entry point is a change to the rule's `allow` list in `tools/oxlint/lint.config.ts`, which needs owner sign-off. The web and mobile apps start no runtime of their own: atoms run their fibers on `clientRuntime` ([`runtime.web`](#runtimeweb-atoms-for-react)).

Route and handler modules never run effects. They export layers, and the entry point merges them.

### runtime.api: one program, a composition root per host

`apps/api/src/app.layer.ts` knows no host. It exports `AppLayer` (routes and modules), `ApiHandler(sql)`, which turns `AppLayer` and better-auth into one fetch handler over the SQL client layer it is given, and `AuthLayer(auth, database)`. A host file supplies the rest. Browser and api share one origin on both hosts, so there is no CORS setup.

`apps/api/src/server.ts` is the composition root on Node. It gives `ApiHandler` a `PgClient.layerConfig` over `DATABASE_URL`, gives better-auth `Auth.layerConfig` (`AUTH_SECRET`) and the same database through `@alchemy.run/better-auth/Postgres`, and serves the handler with `NodeHttpServer` on `PORT`. When `WEB_ROOT` is set, it serves that directory with SPA fallback and sends `/api/*` and `/.well-known/*` to the api. It runs as one long-lived process through `Layer.launch` and `NodeRuntime.runMain`: a layer may hold a pool or run a background loop ([03](03-retry-and-scheduling.md)), and SIGTERM runs every finalizer.

`apps/infra/src/worker.ts` is the composition root on the Cloudflare host. It declares the Worker with Alchemy's `Cloudflare.Worker`, reaches Postgres through Hyperdrive, uses `Auth.layer` with a secret Alchemy generates, and serves `apps/web/dist` as static assets; requests to `/api/*` and `/.well-known/*` reach the Worker first. A Worker has no long-lived process: no `Layer.launch`, no background loop, and per-request resources are released when the request's scope closes. A project keeps one of the two hosts (root ADR 0016).

### runtime.cli: `runMain` on Node

```ts
// apps/cli/src/main.ts
program.pipe(Effect.provide(CliLayer), NodeRuntime.runMain);
```

`runMain` turns SIGINT and SIGTERM into interruption, so every finalizer runs, and sets the exit code from the failure (`Runtime.errorExitCode`, [02](02-typed-errors.md)). The CLI reads `process.env` only through `Config`.

### runtime.web: atoms for React

```ts
// packages/client-runtime/src/todos/todos.atoms.ts
export const todos = clientRuntime
  .atom(TodosClient.use((client) => client.list))
  .pipe(Atom.withReactivity(["todos"]));

// apps/web/src/runtime.ts
export const clientAtoms = [Atom.initialValue(clientLayer, WebClientLayer)];

// apps/web/src/main.tsx
<RegistryProvider initialValues={clientAtoms}>…</RegistryProvider>;

// a component
const list = useAtomValue(todos); // AsyncResult<ReadonlyArray<Todo>, TodosClientError>
```

React and React Router do not run Effect, so they read atoms (root ADR 0012). The atoms live in `packages/client-runtime` and run on `clientRuntime`, whose layer is the `clientLayer` atom; each app seeds it in its registry, and a test seeds a stub. A mutation is a function atom with `reactivityKeys`, which re-runs every atom read with `Atom.withReactivity` on the same keys. A component never calls `Effect.runPromise`, and never squashes a `Cause`: it matches the `AsyncResult` with `AsyncResult.matchWithError` and the error's tag.

### runtime.bridge: `run*With` for a library that calls back through Promises

Some libraries call back only through Promises: better-auth's database adapter, a driver running a transaction body. Such a callback runs its Effect with `Effect.runPromiseWith(context)`, where `context` is `yield* Effect.context()` captured where the library is called, so the callback keeps the fiber's services. Every use carries a `// BRIDGE: …` comment directly above it naming the library and what it calls back for; the lint rule refuses one without.

```ts
const context = yield * Effect.context<SqlClient.SqlClient>();

// BRIDGE: better-auth calls the session hook through a Promise.
const onSession = (session: Session) => Effect.runPromiseWith(context)(audit.record(session));
```

### runtime.exempt: entry points follow every other rule

With `runMain` and `Config`, entry points need neither `console` nor `process.env`. Only `scripts/**`, tool config files and Vitest global setup files are exempt from the ambient-globals rules ([01](01-default-services.md)).

Source: `effect/AGENTS.md` (Running Effect programs), `ai-docs/src/01_effect/06_running/`, `reactivity/Atom.ts`, `@effect/atom-react` `Hooks.ts`, `ManagedRuntime.ts`, `Effect.ts` (`runPromiseWith`), `@effect/platform-node` `NodeRuntime.ts`.
