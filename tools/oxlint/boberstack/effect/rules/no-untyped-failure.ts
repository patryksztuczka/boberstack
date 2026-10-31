import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

import { isEffectCall } from "../shared/effect-imports.ts";
import { isAmbientGlobal } from "../shared/scope.ts";

const builtinErrors = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
]);

const isBareError = (sourceCode: SourceCode, node: ESTree.Node | null | undefined): boolean =>
  node?.type === "NewExpression" &&
  node.callee.type === "Identifier" &&
  builtinErrors.has(node.callee.name) &&
  isAmbientGlobal(sourceCode, node.callee);

const isStringValue = (node: ESTree.Node | null | undefined): boolean =>
  (node?.type === "Literal" && typeof node.value === "string") ||
  node?.type === "TemplateLiteral" ||
  (node?.type === "BinaryExpression" &&
    node.operator === "+" &&
    (isStringValue(node.left) || isStringValue(node.right)));

export const noUntypedFailureRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow failing with strings or built-in Error instances." },
    messages: {
      stringFailure:
        "Fail with a Schema.TaggedError subclass, not a string: callers cannot catchTag a string (see .agents/skills/effect-v4/references/02-typed-errors.md).",
      bareError:
        "Fail with a Schema.TaggedError subclass, not a built-in Error: it carries no tag and no evidence (see .agents/skills/effect-v4/references/02-typed-errors.md).",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const sourceCode = context.sourceCode;

        if (!isEffectCall(sourceCode, node, "Effect", "fail")) return;
        const [argument] = node.arguments;

        if (isStringValue(argument)) context.report({ node, messageId: "stringFailure" });
        else if (isBareError(sourceCode, argument))
          context.report({ node, messageId: "bareError" });
      },
      YieldExpression(node) {
        if (node.delegate && isBareError(context.sourceCode, node.argument)) {
          context.report({ node, messageId: "bareError" });
        }
      },
    };
  },
});
