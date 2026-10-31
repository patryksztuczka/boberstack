import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { keyName } from "../shared/ast.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const defaultAllow = [
  "apps/api/src/worker.ts",
  "apps/api/src/app.layer.ts",
  "apps/cli/src/main.ts",
  "apps/cli/src/commands/*.ts",
];

const isInsideLayerConfigDefinition = (node: ESTree.Node): boolean => {
  let current = node.parent;

  while (current !== null && current !== undefined) {
    if (current.type === "VariableDeclarator") {
      return current.id.type === "Identifier" && current.id.name === "layerConfig";
    }

    if (current.type === "PropertyDefinition") {
      return !current.computed && keyName(current.key) === "layerConfig";
    }

    current = current.parent;
  }

  return false;
};

export const layerConfigOnlyInRootsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Restrict use of `layerConfig` layers to composition roots." },
    messages: {
      notRoot:
        "`{{object}}.layerConfig` reads the environment. Only composition roots (the Worker, app.layer.ts, the CLI entry point and its commands) may use it; use `layer(options)` here (see .agents/skills/effect-v4/references/07-configuration.md).",
    },
    schema: [
      {
        type: "object",
        properties: { allow: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allow: defaultAllow }],
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (
          node.computed ||
          node.property.type !== "Identifier" ||
          node.property.name !== "layerConfig"
        )
          return;
        const { allow } = ruleOptions(context, { allow: defaultAllow });

        if (matchesAny(relativeFilename(context), allow)) return;

        if (isInsideLayerConfigDefinition(node)) return;
        const object = node.object.type === "Identifier" ? node.object.name : "…";
        context.report({ node, messageId: "notRoot", data: { object } });
      },
    };
  },
});
