import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { isAmbientGlobal } from "../shared/scope.ts";

export const noAmbientDateRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow reading the wall clock with an argument-less `new Date()` or `Date()`.",
    },
    messages: {
      ambientDate:
        "`{{call}}` reads the wall clock, which TestClock cannot control. Use `yield* DateTime.now` (see .agents/skills/effect-v4/references/01-default-services.md).",
    },
    schema: [],
  },
  createOnce(context) {
    const check = (node: ESTree.NewExpression | ESTree.CallExpression, call: string): void => {
      if (node.callee.type !== "Identifier" || node.callee.name !== "Date") return;

      if (node.arguments.length > 0) return;

      if (!isAmbientGlobal(context.sourceCode, node.callee)) return;
      context.report({ node, messageId: "ambientDate", data: { call } });
    };

    return {
      NewExpression(node) {
        check(node, "new Date()");
      },
      CallExpression(node) {
        check(node, "Date()");
      },
    };
  },
});
