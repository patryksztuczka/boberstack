import { tester } from "../../rule-tester.ts";
import { noUnsafeDictionaryTypeRule } from "./no-unsafe-dictionary-type.ts";

tester.run("anti-slop/no-unsafe-dictionary-type", noUnsafeDictionaryTypeRule, {
  valid: [
    "type Meta = Record<string, MetaValue>;",
  ],
  invalid: [
    {
      code: "type Meta = Record<string, unknown>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
  ],
});
