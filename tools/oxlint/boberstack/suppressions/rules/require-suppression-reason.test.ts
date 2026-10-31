import { tester } from "../../../rule-tester.ts";
import { requireSuppressionReasonRule } from "./require-suppression-reason.ts";

// VENDOR: @effect/tsgo 0.63.0 reads effect-diagnostics directives inside string literals and reports them as unused, so the cases build the directive.
const effectDirective = (rest: string): string => `// @effect-${"diagnostics"}${rest}`;

tester.run("@boberstack/suppressions/require-suppression-reason", requireSuppressionReasonRule, {
  valid: [
    "// oxlint-disable-next-line no-debugger -- the step-through harness needs it\ndebugger;",
    "debugger; // oxlint-disable-line no-debugger -- the step-through harness needs it",
    "/* oxlint-disable typescript/no-explicit-any -- generated bindings */\nexport const x = 1;",
    "// eslint-disable-next-line react-hooks/exhaustive-deps, react/no-danger -- runs once on mount\nuseEffect(load, []);",
    "// oxlint-enable no-debugger\ndebugger;",
    '// @ts-expect-error the environment argument is required\ncreate("x");',
    '// @ts-expect-error -- the environment argument is required\ncreate("x");',
    `${effectDirective(" nodeBuiltinImport:off -- the lint plugin runs outside Effect")}\nimport fs from 'node:fs';`,
    `${effectDirective("-next-line globalRandom:off -- decorative jitter")}\nconst x = Math.random();`,
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
    {
      code: `${effectDirective(" nodeBuiltinImport:off")}\nimport fs from 'node:fs';`,
      errors: [{ messageId: "effectDiagnosticsReason" }],
    },
    {
      code: `${effectDirective("-next-line globalRandom:off --")}\nconst x = Math.random();`,
      errors: [{ messageId: "effectDiagnosticsReason" }],
    },
    {
      code: `${effectDirective("-next-line -- decorative jitter")}\nconst x = Math.random();`,
      errors: [{ messageId: "effectDiagnosticsReason" }],
    },
  ],
});
