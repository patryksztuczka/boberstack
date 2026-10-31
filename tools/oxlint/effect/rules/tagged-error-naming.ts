import path from "node:path";

import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

import { staticString } from "../shared/ast.ts";
import { isEffectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

const schemaErrorFactories = new Set(["TaggedError", "TaggedErrorClass"]);

const taggedErrorTag = (
  sourceCode: SourceCode,
  superClass: ESTree.Node | null,
): { readonly tag: string | undefined } | undefined => {
  if (superClass?.type !== "CallExpression") return undefined;

  if (isEffectMember(sourceCode, superClass.callee, "Data", "TaggedError")) {
    return { tag: staticString(superClass.arguments[0]) };
  }

  const inner = superClass.callee;

  if (
    inner.type === "CallExpression" &&
    isEffectMember(sourceCode, inner.callee, "Schema", schemaErrorFactories)
  ) {
    return { tag: staticString(superClass.arguments[0]) };
  }

  return undefined;
};

export const taggedErrorNamingRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Enforce naming and placement of tagged error classes." },
    messages: {
      suffix:
        "Error class `{{name}}` must end in `Error` (see .agents/skills/effect-v4/references/02-typed-errors.md).",
      tag: 'Error class `{{name}}` must use `"{{name}}"` as its tag, not `"{{tag}}"` (see .agents/skills/effect-v4/references/02-typed-errors.md).',
      location:
        "Declare error class `{{name}}` in the module's errors file (matching /{{pattern}}/) (see .agents/skills/effect-v4/references/05-project-structure.md).",
    },
    schema: [
      {
        type: "object",
        properties: { filePattern: { type: "string" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ filePattern: "\\.errors\\.ts$" }],
  },
  createOnce(context) {
    const check = (node: ESTree.Class): void => {
      const heritage = taggedErrorTag(context.sourceCode, node.superClass);

      if (heritage === undefined || node.id === null || node.id === undefined) return;
      const name = node.id.name;

      if (!name.endsWith("Error")) {
        context.report({ node: node.id, messageId: "suffix", data: { name } });
      }

      if (heritage.tag !== undefined && heritage.tag !== name) {
        context.report({ node: node.id, messageId: "tag", data: { name, tag: heritage.tag } });
      }

      const { filePattern } = ruleOptions(context, { filePattern: "\\.errors\\.ts$" });

      if (filePattern !== "" && !new RegExp(filePattern).test(path.basename(context.filename))) {
        context.report({
          node: node.id,
          messageId: "location",
          data: { name, pattern: filePattern },
        });
      }
    };

    return { ClassDeclaration: check, ClassExpression: check };
  },
});
