import { defineRule, type ESTree } from "vite-plus/lint/plugins";

import { isEffectCall } from "../shared/effect-imports.ts";

export const noStoreFakesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Database store contracts run on PostgreSQL, without in-memory implementations.",
    },
    messages: {
      storeFake:
        "A store has one implementation, its repository. Run its contract against Postgres in the repository's `*.integration.test.ts` (layer from apps/*/src/testing/pg-test.ts); use Layer.mock for a single failing operation (see .agents/skills/effect-v4/references/05-project-structure.md).",
    },
    schema: [],
  },
  createOnce(context) {
    const check = (node: ESTree.Class) => {
      const name =
        node.id?.name ??
        (node.parent.type === "VariableDeclarator" && node.parent.id.type === "Identifier"
          ? node.parent.id.name
          : undefined);

      if (!name?.endsWith("Store")) return;

      const base = node.superClass;

      if (
        base?.type !== "CallExpression" ||
        !isEffectCall(context.sourceCode, base.callee, "Context", "Service")
      )
        return;

      for (const member of node.body.body) {
        if (member.type !== "PropertyDefinition" && member.type !== "MethodDefinition") continue;

        if (!member.static) continue;

        const key = member.key;

        const name =
          key.type === "Identifier" && !member.computed
            ? key.name
            : key.type === "Literal" && typeof key.value === "string"
              ? key.value
              : undefined;

        if (name === "layerTest" || name === "inMemory") {
          context.report({ node: member, messageId: "storeFake" });
        }
      }
    };

    return { ClassDeclaration: check, ClassExpression: check };
  },
});
