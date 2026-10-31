import { tester } from "../../rule-tester.ts";
import { noUnknownParametersRule } from "./no-unknown-parameters.ts";

tester.run("anti-slop/no-unknown-parameters", noUnknownParametersRule, {
  valid: [
    "const handle = (input: User) => input;",
    "const isUser = (u: unknown): u is User => u !== null;",
  ],
  invalid: [
    {
      code: "const handle = (input: unknown) => input;",
      errors: [{ messageId: "unknownParameter" }],
    },
  ],
});
