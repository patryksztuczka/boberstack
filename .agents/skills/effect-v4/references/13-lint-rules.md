# 13 · Lint rules

These rules make the guide enforceable. All run at `error` with `--deny-warnings` through `vp check` (`pnpm check`), in the pre-commit hook on staged files, and in CI. A review spends its attention on what is not listed here.

All lint config lives in the root `vite.config.ts` (`lint` block); Vite+ ignores nested lint configs. The custom plugins are one workspace package, `@boberstack/oxlint-plugins` in `tools/oxlint/`: one file per rule, a `RuleTester` test beside it, no build step. Oxlint JS plugins work on syntax and import resolution; they cannot see types.

## Everywhere

- Oxlint built-in plugins `typescript`, `oxc`, `import`, `promise`, `vitest`, plus `react` in `apps/web` and `packages/ui`.
- Type-aware rules through tsgolint.
- `import/no-cycle`.

### `anti-slop` (vendored from dmmulroy/anti-slop, MIT)

| Rule                                        | Flags                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `no-array-filter-map`                       | `.filter(…).map(…)` passes back to back                                              |
| `no-chained-type-assertions`                | `x as A as B`                                                                        |
| `no-conditional-empty-object-spread`        | `...(cond ? { a } : {})` to omit a field                                             |
| `no-known-value-widening`                   | a known value flowing into a broad or anonymous type that drops what is known        |
| `no-module-mocking`                         | `vi.mock`, `vi.doMock` ([11](11-testing.md))                                         |
| `no-object-parameters`                      | a parameter typed `object`                                                           |
| `no-reduce-accumulator-copy`                | copying the accumulator on every `reduce` step                                       |
| `no-reflect-apply`                          | `Reflect.apply`                                                                      |
| `no-reflect-get`                            | `Reflect.get`                                                                        |
| `no-runtime-typeof`                         | `typeof x === "…"` checks; decode at the boundary instead ([06](06-schema.md))       |
| `no-shape-in-symbol-names`                  | "shape" in any symbol name; name service types `XxxApi`                              |
| `no-unknown-parameters`                     | a parameter typed `unknown`, except `cause` and a type predicate's subject           |
| `no-unknown-returns`                        | a function whose declared return is `unknown` or `Promise<unknown>`                  |
| `no-unknown-type-aliases`                   | a type alias that resolves to `unknown`                                              |
| `no-unsafe-dictionary-type`                 | `Record<string, unknown>` and other dictionaries of `unknown`, `any`, `object`, `{}` |
| `no-widen-then-assert`                      | widening a value and then asserting it back to a narrower type                       |
| `require-readable-spacing`                  | a blank line between declarations and logical statement groups                       |
| `require-safety-comment-for-type-assertion` | `as X` without a `// SAFETY:` comment naming the invariant                           |

### `anti-slop-effect`

| Rule                             | Flags                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `no-manual-effect-error-tag`     | `_tag` checks inside an `Effect.catch` handler; use `catchTag` ([02](02-typed-errors.md)) |
| `no-manual-tag-comparison`       | `x._tag === "…"`; use `Predicate.isTagged` or a union's `match`                           |
| `no-manual-tagged-construction`  | an object literal with a literal `_tag`; use the tagged `.make`                           |
| `no-service-constructor-imports` | importing a project `make<Name>` outside tests; depend on the service                     |
| `prefer-effect-match`            | chained ternaries on one value; use `Match`                                               |

### `@boberstack/no-comments`

`@boberstack/no-comments/no-comments` reports every comment except tool directives, JSDoc types in plain JavaScript, and lines starting with `VENDOR:`, `SAFETY:`, `BRIDGE:` or `QUARANTINE:`. It offers removal as a suggestion, never an autofix, so a reason without a home is never deleted silently. Why: root ADR 0005.

### `@boberstack/suppressions`

`require-suppression-reason`: an `oxlint-disable*` or `eslint-disable*` names its rule and ends with ` -- <reason>`; `@ts-expect-error` carries a reason; `@ts-ignore` and `@ts-nocheck` are banned. A directive that suppresses nothing is an error too. `pnpm check:suppressions` counts them against `suppressions.baseline.json` and warns on growth.

### `@boberstack/test-hygiene` (test files; ideas from pingdotgg/t3code, MIT)

| Rule                                 | Flags                                                                                                             | Read                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `no-test-timeout-or-unreasoned-skip` | a per-test or per-hook timeout, retry or repeat; `.skip`/`.todo` without `// QUARANTINE: <reason>` above; `.only` | [11](11-testing.md) `test.flaky` |
| `no-real-time-wait-in-tests`         | `setTimeout` and friends, `sleep`/`delay` helpers, `Effect.sleep` outside the TestClock                           | [11](11-testing.md) `test.flaky` |
| `no-polling-loop-in-tests`           | a loop that sleeps or yields each turn until a condition holds                                                    | [11](11-testing.md) `test.flaky` |

### `@boberstack/frontend` (`apps/web`)

`feature-boundaries`: imports go `shared → features → app`, and another feature is reached only through `features/<name>/index.ts`. `src/runtime.ts` is a root and exempt.

## Effect code: `@boberstack/effect/*`

On `apps/api`, `apps/cli`, `apps/infra` and `packages/domain`.

| Rule                         | Flags                                                                                                                | Guide |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----- |
| `branded-ids`                | an `*Id` field typed `Schema.String` or `Schema.Number`                                                              | 06    |
| `config-in-env-schema`       | a `Config` name that is not a literal or not in `.env.schema`; `Config.Redacted` and `@sensitive` that disagree      | 07    |
| `effect-fn-name`             | `Effect.fn` without a literal `<Service>.<method>` name (autofix)                                                    | 08    |
| `layer-config-only-in-roots` | `.layerConfig` outside the composition roots                                                                         | 07    |
| `layer-naming`               | a layer not named `layer` or `layer<Suffix>` (`FooLive`, `Default`)                                                  | 04    |
| `log-literal-message`        | a non-literal first argument to `Effect.log*`                                                                        | 08    |
| `module-boundaries`          | a deep import into another module or context; `platform/` past an index; a module importing a root file              | 05    |
| `no-decode-sync`             | `Schema.decodeUnknownSync`, `decodeSync`, `decodeUnknownPromise` outside scripts and tests                           | 06    |
| `no-domain-adapters`         | a module importing a vendor SDK, a network built-in, `platform/`, or using `fetch`                                   | 05    |
| `no-domain-sql`              | a module, tests included, importing SQL packages, `platform/database/` or `pg-test`; a `*.repository.ts` in a module | 05    |
| `no-error-instanceof`        | `instanceof` a class whose name ends in `Error`                                                                      | 02    |
| `no-error-subclass`          | `class X extends Error` or another built-in error                                                                    | 02    |
| `no-new-promise`             | `new Promise(…)`                                                                                                     | 09    |
| `no-store-fakes`             | `layerTest` or `inMemory` on a `*Store` service                                                                      | 05    |
| `no-throw-in-effect`         | `throw` inside `Effect.gen` or `Effect.fn`                                                                           | 02    |
| `no-try-in-tests`            | `try` in a test file                                                                                                 | 11    |
| `no-untyped-failure`         | `Effect.fail("…")`, `Effect.fail(new Error(…))`                                                                      | 02    |
| `redacted-secrets`           | a secret-looking key read with `Config.String`                                                                       | 07    |
| `retry-requires-while`       | `Effect.retry` without `while` or `until`                                                                            | 03    |
| `run-only-in-entry-points`   | `Effect.run*`, `runMain`, `ManagedRuntime.make` outside the entry points; `run*With` without `// BRIDGE:`            | 10    |
| `service-explicit-shape`     | `Context.Service<Self>()` without an API type argument                                                               | 04    |
| `service-id-matches-path`    | a service id that is not `boberstack/<path>/<Class>` (autofix)                                                       | 05    |
| `tagged-error-naming`        | an error class without the `Error` suffix, with a tag unlike its name, or outside `*.errors.ts`                      | 02    |
| `try-requires-catch`         | `Effect.try` or `Effect.tryPromise` without `{ try, catch }`                                                         | 02    |

Not ported from the upstream Effect plugin: `bounded-concurrency`, `fork-detach-reason` and `no-throw`. Their rules ([09](09-concurrency-and-resources.md), [02](02-typed-errors.md)) are checked in review.

## Configured paths

| Option                             | Value                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-only-in-entry-points` `allow` | `apps/api/src/worker.ts`, `apps/cli/src/main.ts`, `apps/web/src/runtime.ts`, `apps/infra/alchemy.run.ts`                                                                         |
| `layer-config-only-in-roots` roots | `apps/api/src/worker.ts`, `apps/api/src/app.layer.ts`, `apps/cli/src/main.ts`, `apps/cli/src/commands/*.ts`                                                                      |
| `module-boundaries`                | `sourceRoot: apps/*/src/modules`, `indexOnly: apps/*/src/platform/**`, `rootFiles: apps/*/src/*`                                                                                 |
| `service-id-matches-path`          | prefix `boberstack`, `sourceRoot: apps/*/src/modules`, extra roots `apps/*/src/platform` → `boberstack/platform`, `packages/domain/src` → `boberstack/domain`, `idSource: class` |
| `tagged-error-naming`              | `filePattern: \.errors\.ts$`                                                                                                                                                     |

Changing any of these, or turning a rule off, needs owner sign-off ([AGENTS.md](../../../../AGENTS.md)). A targeted `// oxlint-disable-next-line <rule> -- <reason>` is the escape hatch for one real boundary.
