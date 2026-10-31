import path from "node:path";

import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { enclosingClass, staticString } from "../shared/ast.ts";
import { isEffectCall } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { relativeFilename, splitAtRoot, withoutExtension } from "../shared/paths.ts";

const extraRoots = {
  "apps/*/src/platform": "boberstack/platform",
  "packages/domain/src": "boberstack/domain",
} satisfies Readonly<Record<string, string>>;

const defaults = {
  prefix: "boberstack",
  sourceRoot: "apps/*/src/modules",
  extraRoots,
  idSource: "class",
};

const idTail = (rest: string, className: string | undefined, idSource: string): string =>
  idSource === "class" && className !== undefined
    ? path.posix.join(path.posix.dirname(rest), className)
    : withoutExtension(rest);

const expectedId = (
  relative: string,
  className: string | undefined,
  options: typeof defaults,
): string | undefined => {
  for (const [rootGlob, prefix] of Object.entries(options.extraRoots)) {
    const split = splitAtRoot(relative, rootGlob);

    if (split !== undefined) return `${prefix}/${idTail(split.rest, className, options.idSource)}`;
  }

  const split = splitAtRoot(relative, options.sourceRoot);

  return split === undefined
    ? undefined
    : `${options.prefix}/${idTail(split.rest, className, options.idSource)}`;
};

export const serviceIdMatchesPathRule = defineRule({
  meta: {
    type: "problem",
    fixable: "code",
    docs: { description: "Require Context.Service ids to mirror the file path." },
    messages: {
      id: 'Service id should be "{{expected}}" (derived from the file path) (see .agents/skills/effect-best-practices/references/05-project-structure.md).',
      className:
        "Service class `{{name}}` should live in `{{name}}.ts`, not `{{file}}` (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          prefix: { type: "string" },
          sourceRoot: { type: "string" },
          extraRoots: { type: "object", additionalProperties: { type: "string" } },
          idSource: { type: "string", enum: ["file", "class"] },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [defaults],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const inner = node.callee;

        if (inner.type !== "CallExpression" || inner.arguments.length > 0) return;

        if (!isEffectCall(context.sourceCode, inner, "Context", "Service")) return;
        const idNode = node.arguments[0];
        const id = staticString(idNode);

        if (idNode === undefined || id === undefined) return;

        const relative = relativeFilename(context);
        const options = ruleOptions(context, defaults);
        const owner: ESTree.Class | undefined = enclosingClass(node);
        const className = owner?.superClass === node ? owner.id?.name : undefined;
        const expected = expectedId(relative, className, options);

        if (expected === undefined) return;

        if (expected !== id) {
          context.report({
            node: idNode,
            messageId: "id",
            data: { expected },
            fix: (fixer) => fixer.replaceText(idNode, JSON.stringify(expected)),
          });
        }

        const file = withoutExtension(path.basename(relative));

        if (
          options.idSource === "file" &&
          owner?.superClass === node &&
          owner.id &&
          owner.id.name !== file &&
          !file.endsWith(".test")
        ) {
          context.report({
            node: owner.id,
            messageId: "className",
            data: { name: owner.id.name, file: path.basename(relative) },
          });
        }
      },
    };
  },
});
