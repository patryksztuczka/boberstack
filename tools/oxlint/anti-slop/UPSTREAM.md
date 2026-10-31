# Vendored anti-slop

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), MIT, Copyright (c) 2026 Dillon Mulroy (`LICENSE`, kept verbatim).

It reached this starter through `single-source-panel/ssp-audiomatching` (`tools/oxlint/anti-slop`), which vendored the plugin without its upstream test suites. `vendor/eslint-stylistic/` keeps its own `LICENSE` and `UPSTREAM.md`.

Two plugins live here: `index.ts` (`anti-slop`, 18 rules) and `effect/index.ts` (`anti-slop-effect`, 5 rules). Every rule is on everywhere (see `../lint.config.ts`); this folder itself is in `ignorePatterns`.

## Local adaptations

- Imports `vite-plus/lint/plugins` instead of `@oxlint/plugins` (Vite+ re-exports `definePlugin`, `defineRule`, `eslintCompatPlugin` and every type of `@oxlint/plugins` 1.89.0).
- `shared/dictionary-types.ts`: `unsafeMembers[0] ?? null`, needed by TypeScript 7 with `noUncheckedIndexedAccess`.
- `rules/no-module-mocking.ts`: `vi` imported from `vite-plus/test` or `@effect/vitest` counts like `vi` from `vitest`.
- Tests are new: one `*.test.ts` per rule next to it (at least one valid and one invalid case, derived from the rule docs), run with `vp test` through `../rule-tester.ts`. They are focused evidence, not a port of upstream's suites.
