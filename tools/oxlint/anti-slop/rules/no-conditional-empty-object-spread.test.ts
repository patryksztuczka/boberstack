import { tester } from "../../rule-tester.ts";
import { noConditionalEmptyObjectSpreadRule } from "./no-conditional-empty-object-spread.ts";

tester.run("anti-slop/no-conditional-empty-object-spread", noConditionalEmptyObjectSpreadRule, {
  valid: [
    "const body = { name, ...rest };",
    "const body: Body = { name };\nif (id !== undefined) body.id = id;",
  ],
  invalid: [
    {
      code: "const body = { name, ...(id ? { id } : {}) };",
      errors: [{ messageId: "avoid" }],
    },
  ],
});
