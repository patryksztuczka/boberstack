import { defineRule } from "vite-plus/lint/plugins";

import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const defaultTests = ["**/*.test.ts"];

export const noTryInTestsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow `try` statements in test files." },
    messages: {
      tryInTest:
        "Do not use `try` in a test: a `catch` accepts whatever was thrown. Assert a failure with `Effect.flip` or `Effect.exit`, or on the returned `Result`; release resources through a scoped layer or `Effect.acquireRelease` (see .agents/skills/effect-v4/references/11-testing.md).",
    },
    schema: [
      {
        type: "object",
        properties: { tests: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ tests: defaultTests }],
  },
  createOnce(context) {
    return {
      TryStatement(node) {
        const { tests } = ruleOptions(context, { tests: defaultTests });

        if (!matchesAny(relativeFilename(context), tests)) return;
        context.report({ node, messageId: "tryInTest" });
      },
    };
  },
});
