import { tester } from "../../../rule-tester.ts";
import { requireSuppressionReasonRule } from "./require-suppression-reason.ts";

tester.run("@boberstack/suppressions/require-suppression-reason", requireSuppressionReasonRule, {
  valid: [
    "// oxlint-disable-next-line no-debugger -- the step-through harness needs it\ndebugger;",
    "debugger; // oxlint-disable-line no-debugger -- the step-through harness needs it",
    "/* oxlint-disable typescript/no-explicit-any -- generated bindings */\nexport const x = 1;",
    "// eslint-disable-next-line react-hooks/exhaustive-deps, react/no-danger -- runs once on mount\nuseEffect(load, []);",
    "// oxlint-enable no-debugger\ndebugger;",
    '// @ts-expect-error the environment argument is required\ncreate("x");',
    '// @ts-expect-error -- the environment argument is required\ncreate("x");',
    "// @effect-diagnostics nodeBuiltinImport:off\nimport fs from 'node:fs';",
    "// VENDOR: oxlint-disable is not respected by the old parser\nrun();",
    "const directive = '// oxlint-disable-next-line';",
  ],
  invalid: [
    {
      code: "// oxlint-disable-next-line no-debugger\ndebugger;",
      errors: [{ messageId: "noReason" }],
    },
    {
      code: "// oxlint-disable-next-line no-debugger --\ndebugger;",
      errors: [{ messageId: "noReason" }],
    },
    {
      code: "debugger; // eslint-disable-line no-debugger",
      errors: [{ messageId: "noReason" }],
    },
    {
      code: "/* oxlint-disable */\nexport const x = 1;",
      errors: [{ messageId: "noRule" }],
    },
    {
      code: "// oxlint-disable-next-line -- it is fine\ndebugger;",
      errors: [{ messageId: "noRule" }],
    },
    {
      code: '// @ts-expect-error\ncreate("x");',
      errors: [{ messageId: "expectErrorReason" }],
    },
    {
      code: '// @ts-ignore the types are wrong\ncreate("x");',
      errors: [{ messageId: "ignore" }],
    },
    {
      code: "// @ts-nocheck\nexport const x = 1;",
      errors: [{ messageId: "ignore" }],
    },
  ],
});
