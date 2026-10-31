import { defineRule } from "vite-plus/lint/plugins";

import { findProperty } from "../shared/ast.ts";
import { isEffectCall } from "../shared/effect-imports.ts";

const tryMethods = new Set(["try", "tryPromise"]);

export const tryRequiresCatchRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require the `{ try, catch }` form of Effect.try and Effect.tryPromise." },
    messages: {
      missingCatch:
        "Use `Effect.{{method}}({ try, catch })` and map the thrown value to a tagged error in `catch` (see .agents/skills/effect-best-practices/references/02-typed-errors.md).",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isEffectCall(context.sourceCode, node, "Effect", tryMethods)) return;
        const [argument] = node.arguments;

        if (
          argument?.type === "ObjectExpression" &&
          findProperty(argument, "catch") !== undefined
        ) {
          return;
        }

        const method =
          node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier"
            ? node.callee.property.name
            : "try";

        context.report({ node, messageId: "missingCatch", data: { method } });
      },
    };
  },
});
