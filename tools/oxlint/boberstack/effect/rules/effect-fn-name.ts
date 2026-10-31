import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

import { boundName, enclosingClass, staticString } from "../shared/ast.ts";
import { effectMember, isEffectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

const serviceFactories = new Set(["Service", "Tag", "GenericTag"]);

const serviceClassName = (sourceCode: SourceCode, node: ESTree.Node): string | undefined => {
  let owner = enclosingClass(node);

  while (owner !== undefined) {
    let heritage: ESTree.Node | null | undefined = owner.superClass;

    while (heritage?.type === "CallExpression") {
      const factory = effectMember(sourceCode, heritage.callee);

      if (
        (factory?.module === "Context" || factory?.module === "Effect") &&
        serviceFactories.has(factory.member)
      ) {
        return owner.id?.name;
      }

      heritage = heritage.callee;
    }

    owner = enclosingClass(owner);
  }

  return undefined;
};

const isFunction = (node: ESTree.Node | undefined): boolean =>
  node?.type === "FunctionExpression" || node?.type === "ArrowFunctionExpression";

export const effectFnNameRule = defineRule({
  meta: {
    type: "problem",
    fixable: "code",
    docs: { description: "Require literal `<Service>.<method>` span names for Effect.fn." },
    messages: {
      missing:
        "Give Effect.fn a span name{{expected}}: unnamed functions produce no span (see .agents/skills/effect-best-practices/references/08-observability.md).",
      nonLiteral:
        "The Effect.fn span name must be a string literal (see .agents/skills/effect-best-practices/references/08-observability.md).",
      mismatch:
        'Span name should be "{{expected}}" to match the service and method (see .agents/skills/effect-best-practices/references/08-observability.md).',
    },
    schema: [
      {
        type: "object",
        properties: { matchEnclosing: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ matchEnclosing: true }],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const sourceCode = context.sourceCode;

        if (!isEffectMember(sourceCode, node.callee, "Effect", "fn")) return;
        const [first] = node.arguments;
        const unnamed = isFunction(first);

        const bound = unnamed
          ? node
          : node.parent?.type === "CallExpression" && node.parent.callee === node
            ? node.parent
            : node;

        const { matchEnclosing } = ruleOptions(context, { matchEnclosing: true });
        const method = boundName(bound);
        const service = serviceClassName(sourceCode, node);

        const expected =
          matchEnclosing && method !== undefined && service !== undefined
            ? `${service}.${method}`
            : undefined;

        if (unnamed) {
          const callee = node.callee;

          if (expected === undefined) {
            context.report({ node, messageId: "missing", data: { expected: "" } });
          } else {
            context.report({
              node,
              messageId: "missing",
              data: { expected: ` ("${expected}")` },
              fix: (fixer) => fixer.insertTextAfter(callee, `(${JSON.stringify(expected)})`),
            });
          }

          return;
        }

        const name = staticString(first);

        if (first === undefined || name === undefined) {
          context.report({ node, messageId: "nonLiteral" });

          return;
        }

        if (expected !== undefined && name !== expected) {
          context.report({
            node: first,
            messageId: "mismatch",
            data: { expected },
            fix: (fixer) => fixer.replaceText(first, JSON.stringify(expected)),
          });
        }
      },
    };
  },
});
