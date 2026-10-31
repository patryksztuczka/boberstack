import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

import { resolveVariable } from "./scope.ts";

export interface ImportedModule {
  readonly source: string;
  readonly module: string;
}

const importedModule = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): ImportedModule | undefined => {
  const definition = resolveVariable(sourceCode, identifier)?.defs[0];

  if (definition?.type !== "ImportBinding") return undefined;
  const declaration = definition.parent;

  if (declaration?.type !== "ImportDeclaration") return undefined;
  const source = declaration.source.value;
  const specifier = definition.node;

  if (specifier.type === "ImportSpecifier") {
    const imported = specifier.imported;
    const module = imported.type === "Identifier" ? imported.name : imported.value;

    return { source, module };
  }

  if (specifier.type === "ImportNamespaceSpecifier") {
    const module = source.split("/").at(-1);

    return module === undefined ? undefined : { source, module };
  }

  return undefined;
};

export const isEffectSource = (source: string): boolean =>
  source === "effect" || source.startsWith("effect/") || source.startsWith("@effect/");

export const effectMember = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
): { readonly module: string; readonly member: string } | undefined => {
  if (node?.type !== "MemberExpression" || node.computed) return undefined;

  if (node.object.type !== "Identifier" || node.property.type !== "Identifier") return undefined;
  const imported = importedModule(sourceCode, node.object);

  if (imported === undefined || !isEffectSource(imported.source)) return undefined;

  return { module: imported.module, member: node.property.name };
};

export const isEffectMember = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
  module: string,
  members: ReadonlySet<string> | string,
): boolean => {
  const found = effectMember(sourceCode, node);

  if (found === undefined || found.module !== module) return false;

  return typeof members === "string" ? found.member === members : members.has(found.member);
};

export const isEffectCall = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
  module: string,
  members: ReadonlySet<string> | string,
): node is ESTree.CallExpression =>
  node?.type === "CallExpression" && isEffectMember(sourceCode, node.callee, module, members);
