import { tester } from "../../../rule-tester.ts";
import { preferEffectMatchRule } from "./prefer-effect-match.ts";

tester.run("anti-slop-effect/prefer-effect-match", preferEffectMatchRule, {
  valid: [
    "const n = s === \"a\" ? 1 : 0;",
  ],
  invalid: [
    {
      code: "const n = s === \"a\" ? 1 : s === \"b\" ? 2 : 0;",
      errors: [{ messageId: "preferMatch" }],
    },
  ],
});
