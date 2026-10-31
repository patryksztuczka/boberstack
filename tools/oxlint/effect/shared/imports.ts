import path from "node:path";

import type { ESTree, Visitor } from "vite-plus/lint/plugins";

import { isRequire, type Specifier, specifierOf } from "./ast.ts";
import { matchesAny, mayReach, withoutExtension } from "./paths.ts";

export type ImportSite = {
  readonly node: ESTree.Node;
  readonly specifier: Specifier | undefined;
  readonly runtime: boolean;
};

export const importSites = (visit: (site: ImportSite) => void): Visitor => ({
  ImportDeclaration(node: ESTree.ImportDeclaration) {
    visit({ node, specifier: specifierOf(node.source), runtime: false });
  },
  ImportExpression(node: ESTree.ImportExpression) {
    visit({ node, specifier: specifierOf(node.source), runtime: true });
  },
  ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration) {
    if (node.source !== null) visit({ node, specifier: specifierOf(node.source), runtime: false });
  },
  ExportAllDeclaration(node: ESTree.ExportAllDeclaration) {
    visit({ node, specifier: specifierOf(node.source), runtime: false });
  },
  CallExpression(node: ESTree.CallExpression) {
    if (isRequire(node.callee) && node.arguments.length > 0) {
      visit({ node, specifier: specifierOf(node.arguments[0]), runtime: true });
    }
  },
  TSImportEqualsDeclaration(node: ESTree.TSImportEqualsDeclaration) {
    if (node.moduleReference.type !== "TSExternalModuleReference") return;
    visit({ node, specifier: specifierOf(node.moduleReference.expression), runtime: false });
  },
  TSImportType(node: ESTree.TSImportType) {
    visit({ node, specifier: specifierOf(node.source), runtime: false });
  },
});

export const relativeTarget = (specifier: Specifier, importer: string): string | undefined =>
  specifier.text.startsWith("./") || specifier.text.startsWith("../")
    ? path.posix.join(path.posix.dirname(importer), specifier.text)
    : undefined;

export const reaches = (
  target: string,
  partial: boolean,
  globs: ReadonlyArray<string>,
): boolean => {
  if (partial) return mayReach(target, globs);
  const folder = target.replace(/\/+$/, "");
  const file = withoutExtension(folder);

  const candidates = target.endsWith("/")
    ? [`${folder}/index`]
    : file === folder
      ? [file, `${folder}/index`]
      : [file];

  return candidates.some((candidate) => matchesAny(candidate, globs));
};
