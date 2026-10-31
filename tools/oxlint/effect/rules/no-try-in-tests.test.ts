import { tester } from "../../rule-tester.ts";
import { noTryInTestsRule } from "./no-try-in-tests.ts";

const error = { messageId: "tryInTest" };

const tryCatch = "try { await complete(todo); } catch (cause) { refusal = cause; }";

tester.run("effect/no-try-in-tests", noTryInTestsRule, {
  valid: [
    { code: tryCatch, filename: "apps/api/src/modules/identity/identity.persistence.ts" },
    {
      code: tryCatch,
      filename: "apps/api/src/modules/identity/a.test.ts",
      options: [{ tests: ["**/*.spec.ts"] }],
    },
  ],
  invalid: [
    { code: tryCatch, filename: "apps/api/src/modules/identity/a.test.ts", errors: [error] },
    {
      code: tryCatch,
      filename: "apps/api/src/modules/identity/a.spec.ts",
      options: [{ tests: ["**/*.spec.ts"] }],
      errors: [error],
    },
  ],
});
