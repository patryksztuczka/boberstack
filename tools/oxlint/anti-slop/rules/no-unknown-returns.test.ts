import { tester } from "../../rule-tester.ts";
import { noUnknownReturnsRule } from "./no-unknown-returns.ts";

tester.run("anti-slop/no-unknown-returns", noUnknownReturnsRule, {
  valid: [
    "function load(): Promise<User> {\n  return fetchUser();\n}",
  ],
  invalid: [
    {
      code: "function load(): Promise<unknown> {\n  return fetchUser();\n}",
      errors: [{ messageId: "unknownReturn" }],
    },
  ],
});
