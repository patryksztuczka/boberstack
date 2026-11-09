# effect

Oxlint JS plugin (`@boberstack/effect/<rule>`) that enforces the Effect v4 style in [`.agents/skills/effect-best-practices`](../../../.agents/skills/effect-best-practices/SKILL.md). Every message names the reference file that explains it. Ported from `single-source-panel/ssp-audiomatching` (`tools/oxlint/ssp-effect`).

- One file per rule in `rules/`, with a co-located `RuleTester` test (`pnpm --filter @boberstack/oxlint-plugins test`).
- No build step: oxlint loads `index.ts` directly.
- No type information: rules work on syntax plus import resolution. `Effect`, `Schema`, `Layer` and friends are recognised only when bound by an import from `effect`, `@boberstack/effect/*` or `@effect/*`, so a local `const Effect = …` is never flagged.

The rules are on at `error` for `apps/api`, `apps/cli`, `apps/desktop`, `apps/infra` and every package under `packages/` (see [`../lint.config.ts`](../lint.config.ts)), so a new adapter package is covered without a config change. Defaults match this starter's layout; the config repeats the path options so they are visible in one place.

## Rules

The rules, what each flags and the paths they are configured with are listed in [`13-lint-rules.md`](../../../.agents/skills/effect-best-practices/references/13-lint-rules.md).

## no-domain-sql's exceptions

`no-domain-sql` has no test allowance of its own: a module's unit tests never reach the database. A file that must (say, an integration suite under a module) goes into the rule's `exceptions` option in `lint.config.ts`, as a glob mapped to its reason. A specifier built at runtime is refused even when its static head points elsewhere, because a substitution may hold `../`; such a file also goes into `exceptions` with its reason.

## Limits

- `module-boundaries` and `no-domain-sql` resolve relative imports and configured aliases only, without touching the file system.
- `no-domain-adapters` misses a network global reached through another binding (`const g = globalThis; g.fetch`), code built at runtime (`eval`), and a path alias to an adapter package that `platformAliases` does not name. Every `@boberstack/*` import except a `contractPackages` entry counts as an adapter.
- `no-domain-sql` sees a file's own imports, not what they import in turn.
- `effect-fn-name` infers the expected name only inside a class extending `Context.Service` / `Effect.Service` / `Context.Tag`; elsewhere it only requires a literal name.
- `no-untyped-failure` cannot see through variables that hold a string.
- `no-error-instanceof` goes by name: a class not ending in `Error`, or one held in a variable, is not seen.
