import { tester } from "../../rule-tester.ts";
import { noModuleMockingRule } from "./no-module-mocking.ts";

tester.run("anti-slop/no-module-mocking", noModuleMockingRule, {
  valid: [
    "import { vi } from \"vite-plus/test\";\nconst spy = vi.fn();",
    "const db = { mock: (path: string) => path };\ndb.mock(\"./db\");",
  ],
  invalid: [
    {
      code: "vi.mock(\"./db\");",
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: "import { vi } from \"vite-plus/test\";\nvi.mock(\"./db\");",
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: "import { vi } from \"vitest\";\nvi.doMock(\"./db\");",
      errors: [{ messageId: "moduleMock" }],
    },
  ],
});
