import { tester } from "../../rule-tester.ts";
import { noRuntimeTypeofRule } from "./no-runtime-typeof.ts";

tester.run("anti-slop/no-runtime-typeof", noRuntimeTypeofRule, {
  valid: [
    "const input = decodeInput(raw);",
    {
      code: "const isString = (u: unknown): u is string => typeof u === \"string\";",
      options: [{allowInTypeGuards: true}],
    },
  ],
  invalid: [
    {
      code: "if (typeof input === \"string\") {\n  use(input);\n}",
      errors: [{ messageId: "runtimeTypeof" }],
    },
  ],
});
