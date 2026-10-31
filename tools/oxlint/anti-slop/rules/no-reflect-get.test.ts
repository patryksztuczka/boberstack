import { tester } from "../../rule-tester.ts";
import { noReflectGetRule } from "./no-reflect-get.ts";

tester.run("anti-slop/no-reflect-get", noReflectGetRule, {
  valid: [
    "const name = obj.name;",
  ],
  invalid: [
    {
      code: "const name = Reflect.get(obj, \"name\");",
      errors: [{ messageId: "reflectGet" }],
    },
  ],
});
