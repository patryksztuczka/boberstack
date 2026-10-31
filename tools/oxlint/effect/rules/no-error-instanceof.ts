import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

const className = (node: ESTree.Node): string | undefined => {
  if (node.type === "Identifier") return node.name;

  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }

  return undefined;
};

export const noErrorInstanceofRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow `instanceof` checks against error classes." },
    messages: {
      errorInstanceof:
        '`instanceof {{name}}` recovers by class, and treats a defect that happens to be one as an expected failure. Recover with `Effect.catchTag` / `catchTags`, test a value with `Predicate.isTagged("…")` or `Schema.is(…)`, or use `Predicate.isError` for a foreign value (see .agents/skills/effect-v4/references/02-typed-errors.md).',
    },
    schema: [],
  },
  createOnce(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== "instanceof") return;
        const name = className(node.right);

        if (name === undefined || !name.endsWith("Error")) return;
        context.report({
          node,
          messageId: "errorInstanceof",
          data: { name: context.sourceCode.getText(node.right) },
        });
      },
    };
  },
});
