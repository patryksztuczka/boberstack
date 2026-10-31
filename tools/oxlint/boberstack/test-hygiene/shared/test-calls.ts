import type { ESTree } from "vite-plus/lint/plugins";

import { keyName } from "../../effect/shared/ast.ts";

export const testFilePattern = /\.test\.[cm]?[jt]sx?$/u;

export const seeTestingDoc =
  "(see .agents/skills/effect-best-practices/references/11-testing.md, test.flaky)";

export const functionTypes: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);

export type CalleeChain = {
  readonly root: string;
  readonly members: ReadonlyArray<string>;
  readonly calls: ReadonlyArray<ESTree.CallExpression>;
};

export const unwrap = (node: ESTree.Node | null | undefined): ESTree.Node | undefined => {
  let current = node ?? undefined;

  while (
    current?.type === "TSNonNullExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "ParenthesizedExpression" ||
    current?.type === "ChainExpression"
  ) {
    current = current.expression;
  }

  return current;
};

export const propertyName = (node: ESTree.MemberExpression): string | undefined => {
  if (!node.computed) return node.property.type === "Identifier" ? node.property.name : undefined;

  return node.property.type === "Literal" && typeof node.property.value === "string"
    ? node.property.value
    : undefined;
};

export const calleeChain = (callee: ESTree.Node | null | undefined): CalleeChain | undefined => {
  const members: string[] = [];
  const calls: ESTree.CallExpression[] = [];
  let current = unwrap(callee);

  while (current !== undefined) {
    if (current.type === "Identifier") {
      return { root: current.name, members: members.toReversed(), calls };
    }

    if (current.type === "CallExpression") {
      calls.push(current);
      current = unwrap(current.callee);
    } else if (current.type === "MemberExpression") {
      const name = propertyName(current);

      if (name === undefined) return undefined;
      members.push(name);
      current = unwrap(current.object);
    } else {
      return undefined;
    }
  }

  return undefined;
};

export const memberCall = (
  callee: ESTree.Node | null | undefined,
): readonly [string, string] | undefined => {
  const expression = unwrap(callee);

  if (expression?.type !== "MemberExpression") return undefined;
  const object = unwrap(expression.object);
  const property = propertyName(expression);

  if (object?.type !== "Identifier" || property === undefined) return undefined;

  return [object.name, property];
};

export const isMemberCall = (
  callee: ESTree.Node | null | undefined,
  object: string,
  property: string,
): boolean => {
  const call = memberCall(callee);

  return call !== undefined && call[0] === object && call[1] === property;
};

export const isIdentifierNamed = (
  node: ESTree.Node | null | undefined,
  names: ReadonlySet<string>,
): boolean => {
  const expression = unwrap(node);

  return expression?.type === "Identifier" && names.has(expression.name);
};

export const objectKeys = (node: ESTree.Node | null | undefined): ReadonlyArray<string> => {
  const expression = unwrap(node);

  if (expression?.type !== "ObjectExpression") return [];

  return expression.properties.flatMap((property) => {
    if (property.type !== "Property" || property.computed) return [];
    const name = keyName(property.key);

    return name === undefined ? [] : [name];
  });
};

export const enabledKeys = (node: ESTree.Node | null | undefined): ReadonlyArray<string> => {
  const expression = unwrap(node);

  if (expression?.type !== "ObjectExpression") return [];

  return expression.properties.flatMap((property) => {
    if (property.type !== "Property" || property.computed) return [];
    const name = keyName(property.key);
    const value = unwrap(property.value);

    return name !== undefined && value?.type === "Literal" && value.value === true ? [name] : [];
  });
};

type Field = ESTree.Node | string | number | boolean | null | undefined | ReadonlyArray<Field>;

const isNode = (value: Field): value is ESTree.Node =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

const childrenOf = (node: ESTree.Node): ReadonlyArray<ESTree.Node> =>
  Object.entries(node).flatMap(([key, value]: [string, Field]) => {
    if (key === "parent") return [];

    if (Array.isArray(value)) return value.filter((item: Field) => isNode(item));

    return isNode(value) ? [value] : [];
  });

export const someDescendant = (
  node: ESTree.Node | null | undefined,
  match: (node: ESTree.Node) => boolean,
): boolean => {
  if (node === null || node === undefined) return false;

  if (match(node)) return true;

  if (functionTypes.has(node.type)) return false;

  return childrenOf(node).some((child) => someDescendant(child, match));
};
