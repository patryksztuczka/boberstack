import { tester } from "../../../rule-tester.ts";
import { noServiceConstructorImportsRule } from "./no-service-constructor-imports.ts";

tester.run("anti-slop-effect/no-service-constructor-imports", noServiceConstructorImportsRule, {
  valid: [
    "import { UserRepo } from \"./user-repo\";",
    "import { makeThing } from \"some-package\";",
    {
      code: "import { makeUserRepo } from \"./user-repo\";",
      filename: "user.service.test.ts",
    },
  ],
  invalid: [
    {
      code: "import { makeUserRepo } from \"./user-repo\";",
      errors: [{ messageId: "serviceConstructorImport" }],
    },
  ],
});
