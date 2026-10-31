import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { isAmbientGlobal } from "../shared/scope.ts";

const builtinErrors = new Set([
  "Error",
  "AggregateError",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SuppressedError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

export const noErrorSubclassRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow subclassing built-in Error classes." },
    messages: {
      errorSubclass:
        "Do not extend `{{base}}`: callers cannot catch the result by tag. Declare a `Schema.TaggedError` in the module's `*.errors.ts` file; in a test, use a tagged error or assert on the failure itself (see .agents/skills/effect-v4/references/02-typed-errors.md).",
    },
    schema: [],
  },
  createOnce(context) {
    const check = (node: ESTree.Class): void => {
      const base = node.superClass;

      if (base?.type !== "Identifier" || !builtinErrors.has(base.name)) return;

      if (!isAmbientGlobal(context.sourceCode, base)) return;
      context.report({
        node: node.id ?? base,
        messageId: "errorSubclass",
        data: { base: base.name },
      });
    };

    return { ClassDeclaration: check, ClassExpression: check };
  },
});
