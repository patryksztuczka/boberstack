import { defineRule } from "vite-plus/lint/plugins";

import { isAmbientGlobal } from "../shared/scope.ts";

export const noNewPromiseRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow constructing Promises by hand." },
    messages: {
      newPromise:
        "Wrap callback APIs with Effect (`Effect.callback` in v4, `Effect.async` in v3) instead of constructing a Promise, so interruption and typed errors still work (see .agents/skills/effect-best-practices/references/09-concurrency-and-resources.md).",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      NewExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "Promise" &&
          isAmbientGlobal(context.sourceCode, node.callee)
        ) {
          context.report({ node, messageId: "newPromise" });
        }
      },
    };
  },
});
