import { tester } from "../../rule-tester.ts";
import { noReduceAccumulatorCopyRule } from "./no-reduce-accumulator-copy.ts";

tester.run("anti-slop/no-reduce-accumulator-copy", noReduceAccumulatorCopyRule, {
  valid: [
    "xs.map((x) => x.id);",
    "xs.reduce((acc, x) => {\n  acc.push(x.id);\n  return acc;\n}, []);",
  ],
  invalid: [
    {
      code: "xs.reduce((acc, x) => acc.concat([x.id]), []);",
      errors: [{ messageId: "accumulatorCopy" }],
    },
  ],
});
