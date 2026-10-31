import { tester } from "../../rule-tester.ts";
import { noWidenThenAssertRule } from "./no-widen-then-assert.ts";

tester.run("anti-slop/no-widen-then-assert", noWidenThenAssertRule, {
  valid: [
    "const v = { a: 1 };\nuse(v);",
  ],
  invalid: [
    {
      code: "const v: unknown = { a: 1 };\nuse(v as { a: number });",
      errors: [{ messageId: "widenThenAssert" }],
    },
  ],
});
