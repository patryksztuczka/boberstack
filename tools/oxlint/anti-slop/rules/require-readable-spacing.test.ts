import { tester } from "../../rule-tester.ts";
import { requireReadableSpacingRule } from "./require-readable-spacing.ts";

const expected = { messageId: "expectedBlankLine" };

tester.run("anti-slop/require-readable-spacing", requireReadableSpacingRule, {
  valid: [
    "function load(id: string) {\n  const user = find(id);\n\n  return user;\n}",
    'import { a } from "a";\nimport { b } from "b";\n\nconst c = a + b;',
    "function run() {\n  const a = 1;\n  const b = 2;\n\n  return a + b;\n}",
  ],
  invalid: [
    {
      code: "function load(id: string) {\n  const user = find(id);\n  return user;\n}",
      output: "function load(id: string) {\n  const user = find(id);\n\n  return user;\n}",
      errors: [expected],
    },
    {
      code: 'import { a } from "a";\nconst c = a;',
      output: 'import { a } from "a";\n\nconst c = a;',
      errors: [expected],
    },
    {
      code: "function run() {\n  const ok = check();\n  if (ok) {\n    go();\n  }\n  done();\n}",
      output: "function run() {\n  const ok = check();\n\n  if (ok) {\n    go();\n  }\n\n  done();\n}",
      errors: [expected, expected],
    },
  ],
});
