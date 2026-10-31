import { tester } from "../../../rule-tester.ts";
import { noManualTaggedConstructionRule } from "./no-manual-tagged-construction.ts";

tester.run("anti-slop-effect/no-manual-tagged-construction", noManualTaggedConstructionRule, {
  valid: [
    "const err = NotFound.make({ id });",
  ],
  invalid: [
    {
      code: "const err = { _tag: \"NotFound\", id };",
      errors: [{ messageId: "manualConstruction" }],
    },
  ],
});
