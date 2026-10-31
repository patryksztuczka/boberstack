# Keep only comments about other people's defects

**Status:** accepted, 2026-10-30. Adapted from a production Effect codebase, where the previous, looser rule had let about 9,300 comments grow.

Code in this repository carries no prose comments. A comment stays only when it records a defect or quirk in software we do not own, such as a browser, the Workers runtime, an SDK, a library or a build tool, and the code that works around it. Such a comment starts with `VENDOR:`. Everything else a comment would say has a home listed in [docs/README.md](../../../README.md#where-a-sentence-belongs): a name, a type or a test, or the glossary, ADR, module file or commit message it belongs to.

A vendor workaround is the one reason that belongs at the line. The code looks wrong without it, the next reader would "fix" it, and the reason stops being true when the vendor ships a fix. Any other reason outlives the line, and a copy beside the code drifts from the place that holds the original. Agents also copy comments into new code, which spreads a workaround along with its excuse. A rule that allows "useful" comments cannot be checked: no linter can tell a useful comment from narration.

## What stays

- `VENDOR:` comments. One may run over several lines; the comment lines directly after it belong to it.
- Tool directives with their reason on the same line: `oxlint-disable-next-line <rule> -- <reason>`, `@ts-expect-error <reason>`, `@effect-diagnostics-next-line`, triple-slash references, `@vite-ignore`, `@__PURE__`, `@jsxImportSource`, formatter and coverage ignores.
- Markers other rules ask for: `SAFETY:` above a type assertion, `BRIDGE:` above a `run*With` at a library callback, `THROW:` at a library callback whose protocol needs a throw, `DETACH:` above `Effect.forkDetach`.
- JSDoc made only of type tags in plain JavaScript, where it is the types.

## Enforcement

`no-comments/no-comments` in `tools/oxlint/no-comments` reports every other comment in TypeScript and JavaScript. It offers the removal as a suggestion, not an autofix, so a fix run never deletes a reason that has no home yet.

## Cost

Exported symbols lose their JSDoc, so an editor's hover shows a signature and no prose. A reader who needs the reason opens the glossary or the ADR. A vendor note that needs more than a few lines is a sign the workaround deserves an ADR, with the comment linking there.

## Considered options

- Allow comments for deviations, invariants and spec references: nothing can check it.
- Ban comments with an autofix, as rat-stack does: its own notes warn that the fix deletes the reason and leaves the workaround behind.
