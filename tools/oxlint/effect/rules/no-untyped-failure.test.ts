import { tester } from "../../rule-tester.ts";
import { noUntypedFailureRule } from "./no-untyped-failure.ts";

tester.run("effect/no-untyped-failure", noUntypedFailureRule, {
  valid: [
    'import { Effect } from "effect"; Effect.fail(new SegmentNotFoundError({ segmentId }));',
    'import { Effect } from "effect"; Effect.gen(function* () { return yield* new SegmentNotFoundError({ segmentId }); });',
    'import { Effect } from "effect"; Effect.die(new Error("invariant"));',
    'const Effect = { fail: (x) => x }; Effect.fail("nope");',
    'class Error {} import { Effect } from "effect"; Effect.fail(new Error());',
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; Effect.fail("segment not found");',
      errors: [{ messageId: "stringFailure" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.fail(`segment ${id} not found`);',
      errors: [{ messageId: "stringFailure" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.fail("no todo " + todoId);',
      errors: [{ messageId: "stringFailure" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.fail(new Error("segment not found"));',
      errors: [{ messageId: "bareError" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.fail(new TypeError("bad"));',
      errors: [{ messageId: "bareError" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.gen(function* () { return yield* new Error("x"); });',
      errors: [{ messageId: "bareError" }],
    },
  ],
});
