import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

export const staticString = (node: ESTree.Node | null | undefined): string | undefined => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;

  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }

  return undefined;
};

export type Specifier = { readonly text: string; readonly partial: boolean };

export const specifierOf = (node: ESTree.Node | null | undefined): Specifier | undefined => {
  const whole = staticString(node);

  if (whole !== undefined) return { text: whole, partial: false };

  if (node?.type === "BinaryExpression" && node.operator === "+") {
    const left = specifierOf(node.left);
    const right = staticString(node.right);

    if (left === undefined) return undefined;

    if (!left.partial && right !== undefined)
      return { text: `${left.text}${right}`, partial: false };

    return left.text === "" ? undefined : { text: left.text, partial: true };
  }

  if (node?.type !== "TemplateLiteral") return undefined;
  const head = node.quasis[0]?.value.cooked;

  return head === undefined || head === null || head === ""
    ? undefined
    : { text: head, partial: true };
};

export const isRequire = (callee: ESTree.Node): boolean =>
  (callee.type === "Identifier" && callee.name === "require") ||
  (callee.type === "CallExpression" &&
    callee.callee.type === "Identifier" &&
    callee.callee.name === "createRequire");

export const keyName = (key: ESTree.Node): string | undefined => {
  if (key.type === "Identifier") return key.name;

  if (key.type === "Literal" && typeof key.value === "string") return key.value;

  return undefined;
};

export const findProperty = (
  object: ESTree.ObjectExpression,
  name: string,
): ESTree.ObjectProperty | undefined =>
  object.properties.find(
    (property): property is ESTree.ObjectProperty =>
      property.type === "Property" && !property.computed && keyName(property.key) === name,
  );

const isFunctionNode = (node: ESTree.Node): boolean =>
  node.type === "FunctionExpression" ||
  node.type === "FunctionDeclaration" ||
  node.type === "ArrowFunctionExpression";

export const enclosingFunction = (node: ESTree.Node): ESTree.Node | undefined => {
  let current = node.parent;

  while (current !== null && current !== undefined) {
    if (isFunctionNode(current)) return current;
    current = current.parent;
  }

  return undefined;
};

export const enclosingClass = (node: ESTree.Node): ESTree.Class | undefined => {
  let current = node.parent;

  while (current !== null && current !== undefined) {
    if (current.type === "ClassDeclaration" || current.type === "ClassExpression") return current;
    current = current.parent;
  }

  return undefined;
};

export const enclosingStatement = (node: ESTree.Node): ESTree.Node => {
  let current: ESTree.Node = node;

  while (current.parent !== null && current.parent !== undefined) {
    const parent: ESTree.Node = current.parent;

    if (
      parent.type === "BlockStatement" ||
      parent.type === "Program" ||
      parent.type === "StaticBlock" ||
      parent.type === "SwitchCase"
    ) {
      return current;
    }

    current = parent;
  }

  return current;
};

export const hasMarkedReason = (
  sourceCode: SourceCode,
  node: ESTree.Node,
  marker: string,
): boolean => {
  const comments = [
    ...sourceCode.getCommentsBefore(node),
    ...sourceCode.getCommentsBefore(enclosingStatement(node)),
  ];

  return comments.some((comment) => {
    const at = comment.value.indexOf(marker);

    return at !== -1 && comment.value.slice(at + marker.length).trim() !== "";
  });
};

export const boundName = (node: ESTree.Node): string | undefined => {
  const parent = node.parent;

  if (
    parent?.type === "VariableDeclarator" &&
    parent.init === node &&
    parent.id.type === "Identifier"
  ) {
    return parent.id.name;
  }

  if (parent?.type === "Property" && parent.value === node && !parent.computed) {
    return keyName(parent.key);
  }

  if (parent?.type === "PropertyDefinition" && parent.value === node && !parent.computed) {
    return keyName(parent.key);
  }

  return undefined;
};
