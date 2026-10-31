import { tester } from "../../rule-tester.ts";
import { noChainedTypeAssertionsRule } from "./no-chained-type-assertions.ts";

tester.run("anti-slop/no-chained-type-assertions", noChainedTypeAssertionsRule, {
  valid: [
    "const user = decodeUser(raw);",
    "const n = value as number;",
  ],
  invalid: [
    {
      code: "const user = raw as unknown as User;",
      errors: [{ messageId: "chained" }],
    },
  ],
});
