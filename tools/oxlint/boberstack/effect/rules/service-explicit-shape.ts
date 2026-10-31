import { defineRule } from "vite-plus/lint/plugins";

import { isEffectCall } from "../shared/effect-imports.ts";

export const serviceExplicitApiRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require Context.Service classes to declare their API type." },
    messages: {
      missingApi:
        "Declare the service API as the second type argument: `Context.Service<Self, SelfApi>()(id)`, so the contract is visible and implementations cannot widen it (see .agents/skills/effect-best-practices/references/04-services-and-layers.md).",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isEffectCall(context.sourceCode, node, "Context", "Service")) return;

        if (node.arguments.length > 0) return;
        const typeArguments = node.typeArguments?.params.length ?? 0;

        if (typeArguments < 2) context.report({ node, messageId: "missingApi" });
      },
    };
  },
});
