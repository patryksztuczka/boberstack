import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { isRequire, staticString } from "../shared/ast.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const platformModules: ReadonlySet<string> = new Set(["fs", "fs/promises", "os", "child_process"]);

const defaultPaths = ["apps/*/src/modules/**"];

const defaultAllow = ["**/*.test.ts", "**/tests/**", "**/testing/**"];

const isPlatform = (source: string | undefined): source is string =>
  source !== undefined && platformModules.has(source.replace(/^node:/, ""));

export const noPlatformImportsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow value imports of node:fs, node:os and node:child_process in domain modules.",
    },
    messages: {
      platform:
        "`{{source}}` reaches the machine without a service in between. Use Effect's FileSystem, Path or ChildProcessSpawner, captured by the service that needs it; the composition root provides NodeServices.layer (see .agents/skills/effect-v4/references/04-services-and-layers.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          paths: { type: "array", items: { type: "string" } },
          allow: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ paths: defaultPaths, allow: defaultAllow }],
  },
  createOnce(context) {
    const report = (node: ESTree.Node, source: string) => {
      const options = ruleOptions(context, { paths: defaultPaths, allow: defaultAllow });
      const relative = relativeFilename(context);

      if (!matchesAny(relative, options.paths) || matchesAny(relative, options.allow)) return;
      context.report({ node, messageId: "platform", data: { source } });
    };

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type" || !isPlatform(node.source.value)) return;

        const typesOnly =
          node.specifiers.length > 0 &&
          node.specifiers.every(
            (specifier) => specifier.type === "ImportSpecifier" && specifier.importKind === "type",
          );

        if (!typesOnly) report(node, node.source.value);
      },
      ImportExpression(node) {
        const source = staticString(node.source);

        if (isPlatform(source)) report(node, source);
      },
      ExportNamedDeclaration(node) {
        if (node.source === null || node.exportKind === "type") return;

        if (!isPlatform(node.source.value)) return;

        const typesOnly =
          node.specifiers.length > 0 &&
          node.specifiers.every((specifier) => specifier.exportKind === "type");

        if (!typesOnly) report(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        if (node.exportKind !== "type" && isPlatform(node.source.value)) {
          report(node, node.source.value);
        }
      },
      CallExpression(node) {
        if (!isRequire(node.callee)) return;
        const source = staticString(node.arguments[0]);

        if (isPlatform(source)) report(node, source);
      },
      TSImportEqualsDeclaration(node) {
        if (node.importKind === "type") return;

        if (node.moduleReference.type !== "TSExternalModuleReference") return;
        const source = node.moduleReference.expression.value;

        if (isPlatform(source)) report(node, source);
      },
    };
  },
});
