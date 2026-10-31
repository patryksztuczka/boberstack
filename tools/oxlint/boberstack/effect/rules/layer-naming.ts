import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

import { keyName } from "../shared/ast.ts";
import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const layerName = /^layer(?:[A-Z]\w*)?$/;

const isLayerExpression = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
): boolean => {
  if (node === null || node === undefined) return false;

  if (node.type === "ArrowFunctionExpression") {
    return node.body.type !== "BlockStatement" && isLayerExpression(sourceCode, node.body);
  }

  if (node.type !== "CallExpression") return false;
  const callee = node.callee;

  if (effectMember(sourceCode, callee)?.module === "Layer") return true;

  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    callee.property.name === "pipe"
  ) {
    return (
      isLayerExpression(sourceCode, callee.object) ||
      node.arguments.some((argument) => isLayerExpression(sourceCode, argument))
    );
  }

  return false;
};

const isAllowed = (name: string, allowNames: ReadonlyArray<string>): boolean =>
  layerName.test(name) ||
  allowNames.some((allowed) =>
    allowed.startsWith("^") ? new RegExp(allowed).test(name) : allowed === name,
  );

export const layerNamingRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Enforce `layer` / `layer<Suffix>` layer names." },
    messages: {
      name: "Name this layer `layer` or `layer<Suffix>` (layerNoDeps, layerConfig, layerTest), not `{{name}}` (see .agents/skills/effect-v4/references/04-services-and-layers.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowNames: { type: "array", items: { type: "string" } },
          ignoreFiles: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowNames: ["^[A-Z]\\w*Layer$"], ignoreFiles: ["**/*.test.ts"] }],
  },
  createOnce(context) {
    const check = (
      name: string | undefined,
      value: ESTree.Node | null | undefined,
      node: ESTree.Node,
    ): void => {
      if (name === undefined || !isLayerExpression(context.sourceCode, value)) return;

      const options = ruleOptions(context, {
        allowNames: ["^[A-Z]\\w*Layer$"],
        ignoreFiles: ["**/*.test.ts"],
      });

      if (matchesAny(relativeFilename(context), options.ignoreFiles)) return;

      if (!isAllowed(name, options.allowNames))
        context.report({ node, messageId: "name", data: { name } });
    };

    return {
      VariableDeclarator(node) {
        check(node.id.type === "Identifier" ? node.id.name : undefined, node.init, node.id);
      },
      PropertyDefinition(node) {
        check(node.computed ? undefined : keyName(node.key), node.value, node.key);
      },
    };
  },
});
