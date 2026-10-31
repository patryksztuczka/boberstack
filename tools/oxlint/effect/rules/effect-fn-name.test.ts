import { tester } from "../../rule-tester.ts";
import { effectFnNameRule } from "./effect-fn-name.ts";

const inService = (body: string): string =>
  `import { Context, Effect, Layer } from "effect"; class TodoMatcher extends Context.Service<TodoMatcher, Shape>()("id") { static readonly layer = Layer.effect(TodoMatcher, Effect.gen(function* () { ${body} })) }`;

tester.run("effect/effect-fn-name", effectFnNameRule, {
  valid: [
    inService(
      'const match = Effect.fn("TodoMatcher.match")(function* (sample) {}); return TodoMatcher.of({ match });',
    ),
    inService(
      'return TodoMatcher.of({ match: Effect.fn("TodoMatcher.match")(function* (sample) {}) });',
    ),
    'import { Effect } from "effect"; export const compactLedger = Effect.fn("LedgerCompaction.run")(function* () {});',
    {
      code: inService('const match = Effect.fn("anything")(function* () {});'),
      options: [{ matchEnclosing: false }],
    },
    "const Effect = { fn: (f) => f }; const x = Effect.fn(function* () {});",
  ],
  invalid: [
    {
      code: inService("const match = Effect.fn(function* (sample) {});"),
      errors: [{ messageId: "missing" }],
      output: inService('const match = Effect.fn("TodoMatcher.match")(function* (sample) {});'),
    },
    {
      code: inService('const match = Effect.fn("matching")(function* (sample) {});'),
      errors: [{ messageId: "mismatch" }],
      output: inService('const match = Effect.fn("TodoMatcher.match")(function* (sample) {});'),
    },
    {
      code: 'import { Effect } from "effect"; const run = Effect.fn(function* () {});',
      errors: [{ messageId: "missing" }],
    },
    {
      code: 'import { Effect } from "effect"; const run = Effect.fn(spanName)(function* () {});',
      errors: [{ messageId: "nonLiteral" }],
    },
  ],
});
