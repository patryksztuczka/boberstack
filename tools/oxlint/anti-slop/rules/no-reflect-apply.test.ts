import { tester } from "../../rule-tester.ts";
import { noReflectApplyRule } from "./no-reflect-apply.ts";

tester.run("anti-slop/no-reflect-apply", noReflectApplyRule, {
  valid: [
    "fn(...args);",
  ],
  invalid: [
    {
      code: "Reflect.apply(fn, null, args);",
      errors: [{ messageId: "reflectApply" }],
    },
  ],
});
