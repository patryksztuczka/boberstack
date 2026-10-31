import { tester } from "../../rule-tester.ts";
import { noObjectParametersRule } from "./no-object-parameters.ts";

tester.run("anti-slop/no-object-parameters", noObjectParametersRule, {
  valid: [
    "const save = (input: NewUser) => input;",
  ],
  invalid: [
    {
      code: "const save = (input: object) => input;",
      errors: [{ messageId: "objectParameter" }],
    },
  ],
});
