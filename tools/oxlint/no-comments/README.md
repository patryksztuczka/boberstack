# no-comments

Oxlint JS plugin with one rule, `no-comments/no-comments`, on everywhere. Code keeps only:

- `// VENDOR: …` for a workaround of a defect in someone else's software;
- `// SAFETY: …` above a type assertion (`anti-slop/require-safety-comment-for-type-assertion`);
- `// BRIDGE: …` above an Effect-to-Promise bridge (`effect/run-only-in-entry-points`);
- `// QUARANTINE: …` above a skipped test (`test-hygiene/no-test-timeout-or-unreasoned-skip`);
- tool directives (`oxlint-disable`, `@ts-expect-error`, `@effect-diagnostics`, `/// <reference`, `@vite-ignore`, `@__PURE__`, coverage and formatter ignores);
- JSDoc type tags in plain JavaScript files.

Everything else belongs in a name, a type, a test, an ADR (`docs/internals/<context>/adr/`) or the glossary (`docs/internals/<context>/GLOSSARY.md`).

The rule reports a run of adjacent comment lines once and offers to remove it as a suggestion, never as a fix. Move the content first, then run `vp lint --fix-suggestions <file>`.

Ported from `single-source-panel/ssp-audiomatching` (`tools/oxlint/ssp-comments`), with the `THROW:` and `DETACH:` markers dropped because their rules are not used here. Adapted from [rat-stack's `no-comments` rule](https://github.com/joelhooks/rat-stack/blob/main/scripts/oxlint-plugin-no-comments.ts), MIT, Copyright (c) 2026 Joel Hooks.
