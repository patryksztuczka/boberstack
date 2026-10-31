import { tester } from "../../rule-tester.ts";
import { noKnownValueWideningRule } from "./no-known-value-widening.ts";

tester.run("anti-slop/no-known-value-widening", noKnownValueWideningRule, {
  valid: [
    "const config = { port: 3000 } satisfies Config;",
    "const config = { port: 3000 };",
  ],
  invalid: [
    {
      code: "const config: { port: number } = { port: 3000 };",
      errors: [{ messageId: "widening" }],
    },
  ],
});
