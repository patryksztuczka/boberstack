---
name: effect-v4
description: House rules for Effect v4 code in this repository. Use whenever you write, review or refactor Effect code (apps/api, apps/cli, apps/infra, packages/domain, apps/web/src/runtime.ts and feature api hooks): services and layers, typed errors, Schema, Config, HttpApi and RPC handlers, repositories, retries, entry points, and @effect/vitest tests. Also use when a lint message links to .agents/skills/effect-v4/references/.
---

# Effect v4

How Effect code is written here. Each rule has an id (`errors.naming`); cite it in a review finding. The rules oxlint enforces are listed in [13](references/13-lint-rules.md), so a review spends its attention on the rest.

- **Version:** `effect@4.0.7`, with `@effect/platform-node`, `@effect/sql-pg` and `@effect/vitest` on the same exact version. 4.1.0 removed `effect/Crypto`, which `alchemy@2.0.0-beta.84` imports. Bump Effect only together with Alchemy, as a dependency change that needs owner sign-off (AGENTS.md).
- **Source first.** Before using an API you have not used in this repo, read it at the pinned version. Run `pnpm sources:fetch` once: it clones the tagged sources into `.repos/` (gitignored), with `.repos/effect`, `.repos/alchemy` and `.repos/better-auth` pointing at the versions in `pnpm-workspace.yaml`. Read `.repos/effect/packages/effect/src/` and its tests, and the installed `node_modules/.pnpm/effect@4.0.7/node_modules/effect/AGENTS.md` and `ai-docs/`. Blog posts and model memory are often v3 and wrong. Never invent an API; if the source does not show it, it does not exist.
- **Principle:** features are service methods; transports stay thin. A handler decodes input, calls one service method and maps its errors. Pure work is a plain function next to the service.

## Which reference to read

| You are…                                         | Read                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| adding a service, a store, a module or a context | [04](references/04-services-and-layers.md), [05](references/05-project-structure.md)                                                        |
| adding an endpoint or an RPC                     | [06](references/06-schema.md) `schema.sharing`, [02](references/02-typed-errors.md) `errors.http`, [05](references/05-project-structure.md) |
| writing SQL or a migration                       | [05](references/05-project-structure.md) `structure.stores`, [12](references/12-test-layers-and-infrastructure.md)                          |
| reading an env var or a secret                   | [07](references/07-configuration.md)                                                                                                        |
| touching `worker.ts`, `main.ts`, `runtime.ts`    | [10](references/10-runtimes-and-entry-points.md)                                                                                            |
| writing a test                                   | [11](references/11-testing.md), [12](references/12-test-layers-and-infrastructure.md)                                                       |
| writing a form or a query hook in `apps/web`     | [06](references/06-schema.md) `schema.forms`, [10](references/10-runtimes-and-entry-points.md) `runtime.web`                                |
| fixing a lint error                              | the reference the message links to; [13](references/13-lint-rules.md) for the full list                                                     |

## Rule index

| Id                    | Rule                                                                                 | Ref |
| --------------------- | ------------------------------------------------------------------------------------ | --- |
| `defaults.time`       | time comes from `DateTime.now` and `Clock`, never `Date.now`                         | 01  |
| `defaults.random`     | ids and tokens come from `Crypto`; `Random` only for non-secret randomness           | 01  |
| `defaults.globals`    | no `console`, timers, `process.env` or Worker `env` in Effect code                   | 01  |
| `defaults.tests`      | tests drive `TestClock` and pin `Random.withSeed`                                    | 01  |
| `errors.base`         | errors are branded `Schema.TaggedError`; nothing extends `Error`                     | 02  |
| `errors.home`         | wire errors in `packages/domain`, server-only errors in the module's `*.errors.ts`   | 02  |
| `errors.naming`       | the class ends in `Error` and the tag equals the class name                          | 02  |
| `errors.granularity`  | one class per failure, one union per module                                          | 02  |
| `errors.context`      | name the failure, keep its source, say how to fix it                                 | 02  |
| `errors.http`         | `httpApiStatus` on the error, not a hand-built response                              | 02  |
| `errors.defects`      | failures are typed, bugs are defects; `try` always has `catch`                       | 02  |
| `errors.values`       | a pure function that can refuse returns a `Result`                                   | 02  |
| `retry.while`         | retry inline, only the errors you name as transient                                  | 03  |
| `retry.timeout`       | every external call has a timeout                                                    | 03  |
| `jobs.where`          | recurring work on Workers is a Cron Trigger, not a loop                              | 03  |
| `jobs.idempotency`    | a job claims `<job>/<period>` before working                                         | 03  |
| `services.define`     | `Context.Service<Self, Api>()(id, { make })` + `static layer`                        | 04  |
| `services.placement`  | features are service methods; handlers decode, call one method, map errors           | 04  |
| `services.layerNames` | `layer`, `layerNoDeps`, `layerConfig`, `layerTest`; never `Live`                     | 04  |
| `services.wiring`     | `layer` wires services; the root provides infrastructure once                        | 04  |
| `services.platform`   | modules reach the machine and the network only through services                      | 04  |
| `structure.tree`      | contexts under `modules/`, adapters under `platform/`, contract in `packages/domain` | 05  |
| `structure.files`     | kebab-case, one role suffix per file                                                 | 05  |
| `structure.imports`   | modules talk through `index.ts`; no SQL, adapters or root files in modules           | 05  |
| `structure.adapters`  | the port in the module, the adapter in `platform/`, the root chooses                 | 05  |
| `structure.stores`    | `XStore` port, `XRepository` SQL, no in-memory fake                                  | 05  |
| `structure.ids`       | service id `boberstack/<path>/<Class>`                                               | 05  |
| `structure.web`       | `features/<name>/{api,components,forms}`, contract from `@boberstack/domain`         | 05  |
| `schema.records`      | domain records are branded `Schema.Class`                                            | 06  |
| `schema.construction` | decode at the boundary; `make` only where failure is a defect                        | 06  |
| `schema.unions`       | several cases are a `Schema.TaggedUnion` with `match`                                | 06  |
| `schema.ids`          | every identifier is branded                                                          | 06  |
| `schema.decode`       | decode once with `decodeUnknownEffect`; no `as`, no `decodeSync`                     | 06  |
| `schema.sharing`      | what crosses an app boundary lives in `packages/domain`                              | 06  |
| `schema.forms`        | forms validate with the contract's schema via `effectTsResolver`                     | 06  |
| `config.pair`         | `layer(options)` for tests, `layerConfig` only in roots                              | 07  |
| `config.secrets`      | secrets are `Config.Redacted`                                                        | 07  |
| `config.where`        | where each runtime's config comes from                                               | 07  |
| `obs.spans`           | service methods are `Effect.fn`                                                      | 08  |
| `obs.names`           | span name `<Service>.<method>`, a literal                                            | 08  |
| `obs.logs`            | constant message, structured fields                                                  | 08  |
| `obs.errors`          | report once, at the boundary                                                         | 08  |
| `conc.parallel`       | concurrency is a named, small number                                                 | 09  |
| `conc.background`     | background fibers belong to a scope; avoid `forkDetach`                              | 09  |
| `conc.resources`      | `acquireRelease` inside a layer                                                      | 09  |
| `conc.callbacks`      | `Effect.callback`, never `new Promise`                                               | 09  |
| `runtime.allowlist`   | only the four entry points start runtimes                                            | 10  |
| `runtime.worker`      | one Worker, one composition root, SPA assets on the same origin                      | 10  |
| `runtime.cli`         | `NodeRuntime.runMain`                                                                | 10  |
| `runtime.web`         | one `ManagedRuntime`; React enters through it                                        | 10  |
| `runtime.bridge`      | `run*With` + `BRIDGE:` for Promise callbacks                                         | 10  |
| `test.harness`        | `@effect/vitest`, one `layer(…)` suite per scenario                                  | 11  |
| `test.seams`          | test services, stores, errors, endpoints, layers, pure functions                     | 11  |
| `test.errors`         | `Effect.flip`, assert on the tag                                                     | 11  |
| `test.noTry`          | no `try` in tests                                                                    | 11  |
| `tl.mocks`            | `Layer.mock` scenarios in the test file                                              | 12  |
| `tl.postgres`         | one Testcontainers Postgres per run, migrated from `apps/api/migrations`             | 12  |
| `tl.isolation`        | one database per test file                                                           | 12  |
| `tl.safety`           | a test cannot reach a real database                                                  | 12  |

## v3 names you will not see here

| v3 or early v4 beta                                             | v4                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Context.Tag`, `Effect.Service`, `ServiceMap.Service`           | `Context.Service`                                                          |
| `Layer.scoped`                                                  | `Layer.effect`                                                             |
| `.Default`, `FooLive`                                           | `Foo.layer`, descriptive layer suffixes                                    |
| `Effect.catchAll`                                               | `Effect.catch`                                                             |
| `Schema.TaggedErrorClass`                                       | `Schema.TaggedError`                                                       |
| `Effect.fork`, `Effect.forkDaemon`                              | `Effect.forkChild`, `Effect.forkDetach`                                    |
| `Effect.withClock`, `Layer.setClock`, `DefaultServices`         | `Effect.provideService(…, Clock.Clock, …)`                                 |
| `Config.string`                                                 | `Config.String`                                                            |
| `Schema.decodeUnknown`, `Schema.transform`                      | `Schema.decodeUnknownEffect`, `Schema.decodeTo`                            |
| `Either`                                                        | `Result`                                                                   |
| `it.scoped`                                                     | `it.effect`                                                                |
| `@effect/platform`, `@effect/rpc`, `@effect/cli`, `@effect/sql` | `effect/http`, `effect/http-api`, `effect/rpc`, `effect/cli`, `effect/sql` |

## Differences from rat-stack

[rat-stack](https://github.com/joelhooks/rat-stack) shaped several rules here; where we differ, on purpose:

- **Taken:** the `Context.Service(id, { make })` + `static layer = Layer.effect(this, this.make)` shape, dependencies captured in `make`; branded error classes; the error model (name the failure, keep the source, say how to fix it, fall back only to a valid domain answer); `message` and `Runtime.errorExitCode` on errors a person reads; the hook that blocks `--no-verify`.
- **Config:** rat-stack's config service has `layer` read Config and `configLayer` take values. We keep `layer(options)` and `layerConfig`, because `@boberstack/effect/layer-config-only-in-roots` keys on `layerConfig`.
- **Surfaces:** rat-stack projects one capability onto CLI, HTTP, MCP and RPC through its own `defineContract`. We use Effect's `HttpApi` and `RpcGroup` directly, both in `packages/domain` (root ADR 0007). Less machinery, two contracts per operation.
- **Lifecycles:** rat-stack puts finite lifecycles in XState machines. The starter has none; add XState when a real lifecycle appears.
- **Tests:** rat-stack prefers property and model tests. We do too for pure functions, but a store's contract runs on real Postgres with no in-memory fake (root ADR 0004), which rat-stack does not require.
- **Comments:** both ban prose comments. We keep `VENDOR:` notes and refuse an autofix that deletes them (root ADR 0005).
- **Structure:** role-suffixed files (`x.store.ts`, `x.repository.ts`) and the `platform/` adapter folder, enforced by lint, over rat-stack's package-per-cartridge layout.
