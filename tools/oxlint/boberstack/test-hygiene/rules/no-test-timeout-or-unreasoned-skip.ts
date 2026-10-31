import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { hasMarkedReason } from "../../effect/shared/ast.ts";
import {
  calleeChain,
  enabledKeys,
  memberCall,
  objectKeys,
  propertyName,
  testFilePattern,
  seeTestingDoc,
  unwrap,
} from "../shared/test-calls.ts";

const testRoots: ReadonlySet<string> = new Set(["describe", "it", "test", "suite", "layer"]);

const hooks: ReadonlySet<string> = new Set(["beforeAll", "beforeEach", "afterAll", "afterEach"]);

const skipModifiers: ReadonlySet<string> = new Set(["skip", "todo"]);

const skipAliases: ReadonlySet<string> = new Set(["xit", "xtest", "xdescribe"]);

const focusAliases: ReadonlySet<string> = new Set(["fit", "fdescribe"]);

const timeoutOptions: ReadonlySet<string> = new Set(["timeout", "retry", "repeats"]);

const setConfigOptions: ReadonlySet<string> = new Set(["testTimeout", "hookTimeout", "retry"]);

const quarantine = "QUARANTINE:";

const isTestChain = (node: ESTree.Node | null | undefined): boolean => {
  const chain = calleeChain(node);

  return chain !== undefined && testRoots.has(chain.root);
};

const isNumber = (node: ESTree.Node | null | undefined): boolean => {
  const expression = unwrap(node);

  return expression?.type === "Literal" && typeof expression.value === "number";
};

const setsTimeout = (node: ESTree.Node | null | undefined): boolean =>
  objectKeys(node).some((key) => timeoutOptions.has(key));

export const noTestTimeoutOrUnreasonedSkipRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow per-test timeouts and retries, `.only`, and skips without a QUARANTINE reason.",
    },
    messages: {
      timeout: `Per-test timeouts and retries hide a wait that should be event-driven. The timeout in the package's vite.config.ts is the ceiling: remove the override and await the milestone (a Deferred, a Queue, \`vi.waitFor\`, \`findBy*\`). ${seeTestingDoc}.`,
      skip: `A skipped test needs a reason on the line above it: \`// QUARANTINE: <issue or why it is off and when it comes back>\`. A silent skip is a deleted test. ${seeTestingDoc}.`,
      only: `\`.only\` never lands: it turns every other test in the file off, and CI rejects it. Run one test with \`vp test <file> -t "<name>"\` instead. ${seeTestingDoc}.`,
    },
    schema: [],
  },
  create(context) {
    if (!testFilePattern.test(context.filename)) return {};

    const reportSkip = (node: ESTree.Node): void => {
      if (hasMarkedReason(context.sourceCode, node, quarantine)) return;
      context.report({ node, messageId: "skip" });
    };

    return {
      CallExpression(node) {
        const callee = unwrap(node.callee);
        const member = memberCall(callee);

        if (member !== undefined && member[0] === "vi" && member[1] === "setConfig") {
          if (objectKeys(node.arguments[0]).some((key) => setConfigOptions.has(key))) {
            context.report({ node, messageId: "timeout" });
          }

          return;
        }

        if (callee?.type === "Identifier" && hooks.has(callee.name)) {
          if (isNumber(node.arguments[1])) context.report({ node, messageId: "timeout" });

          return;
        }

        if (!isTestChain(callee)) return;
        const [, second, third] = node.arguments;

        if (isNumber(third) || node.arguments.some(setsTimeout)) {
          context.report({ node, messageId: "timeout" });
        }

        const flags = [...enabledKeys(second), ...enabledKeys(third)];

        if (flags.includes("only")) context.report({ node, messageId: "only" });
        else if (flags.some((flag) => skipModifiers.has(flag))) reportSkip(node);
      },
      Identifier(node) {
        const parent = node.parent;

        if (parent?.type !== "CallExpression" || parent.callee !== node) return;

        if (focusAliases.has(node.name)) context.report({ node, messageId: "only" });
        else if (skipAliases.has(node.name)) reportSkip(node);
      },
      MemberExpression(node) {
        const name = propertyName(node);

        if (name === undefined || !isTestChain(node.object)) return;

        if (name === "only") context.report({ node, messageId: "only" });
        else if (skipModifiers.has(name)) reportSkip(node);
      },
    };
  },
});
