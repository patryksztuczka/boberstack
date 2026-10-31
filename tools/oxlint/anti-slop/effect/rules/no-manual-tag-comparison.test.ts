import { tester } from "../../../rule-tester.ts";
import { noManualTagComparisonRule } from "./no-manual-tag-comparison.ts";

tester.run("anti-slop-effect/no-manual-tag-comparison", noManualTagComparisonRule, {
  valid: [
    "if (Predicate.isTagged(result, \"Success\")) {\n  use(result);\n}",
  ],
  invalid: [
    {
      code: "if (result._tag === \"Success\") {\n  use(result);\n}",
      errors: [{ messageId: "manualComparison" }],
    },
    {
      code: "switch (result._tag) {\n  case \"Success\":\n    break;\n}",
      errors: [{ messageId: "manualSwitch" }],
    },
  ],
});
