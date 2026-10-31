import type { ESTree, Scope, SourceCode, Variable } from "vite-plus/lint/plugins";

export const resolveVariable = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): Variable | undefined => {
  let scope: Scope | null = sourceCode.getScope(identifier);

  while (scope !== null) {
    const variable = scope.set.get(identifier.name);

    if (variable !== undefined) return variable;
    scope = scope.upper;
  }

  return undefined;
};

export const isAmbientGlobal = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean => {
  const variable = resolveVariable(sourceCode, identifier);

  return variable === undefined || variable.defs.length === 0;
};
