import { tester } from "../../rule-tester.ts";
import { noUnknownTypeAliasesRule } from "./no-unknown-type-aliases.ts";

tester.run("anti-slop/no-unknown-type-aliases", noUnknownTypeAliasesRule, {
  valid: [
    "type Payload = typeof PayloadSchema.Type;",
  ],
  invalid: [
    {
      code: "type Payload = unknown;",
      errors: [{ messageId: "unknownAlias" }],
    },
  ],
});
