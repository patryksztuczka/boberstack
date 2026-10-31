import { tester } from "../../rule-tester.ts";
import { noForbiddenTermInSymbolNamesRule } from "./no-shape-in-symbol-names.ts";

tester.run("anti-slop/no-shape-in-symbol-names", noForbiddenTermInSymbolNamesRule, {
  valid: [
    "type User = { id: string };",
    "interface TodosApi { readonly list: () => void }",
  ],
  invalid: [
    {
      code: "type UserShape = { id: string };",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
  ],
});
