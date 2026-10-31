import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import {
  isIdentifierNamed,
  isMemberCall,
  seeTestingDoc,
  someDescendant,
  testFilePattern,
  unwrap,
} from "../shared/test-calls.ts";

const counterOperators: ReadonlySet<string> = new Set(["<", "<=", ">", ">="]);

const tickTimers: ReadonlySet<string> = new Set(["setImmediate", "setTimeout"]);

const sleepHelpers: ReadonlySet<string> = new Set(["sleep", "delay"]);

const promiseNames: ReadonlySet<string> = new Set(["Promise"]);

type Loop = ESTree.ForStatement | ESTree.WhileStatement | ESTree.DoWhileStatement;

const executorSchedulesTimer = (executor: ESTree.Node | undefined): boolean => {
  if (isIdentifierNamed(executor, tickTimers)) return true;

  if (executor?.type !== "ArrowFunctionExpression" && executor?.type !== "FunctionExpression") {
    return false;
  }

  return someDescendant(
    executor.body,
    (child) => child.type === "CallExpression" && isIdentifierNamed(child.callee, tickTimers),
  );
};

const isTickPromise = (node: ESTree.Node | null | undefined): boolean => {
  const expression = unwrap(node);

  if (expression?.type === "CallExpression") {
    return (
      isMemberCall(expression.callee, "Promise", "resolve") ||
      (isIdentifierNamed(expression.callee, sleepHelpers) && expression.arguments.length > 0)
    );
  }

  if (expression?.type !== "NewExpression" || !isIdentifierNamed(expression.callee, promiseNames)) {
    return false;
  }

  return executorSchedulesTimer(expression.arguments[0]);
};

const thunkReturnsTick = (node: ESTree.Node | undefined): boolean => {
  if (node?.type !== "ArrowFunctionExpression") return false;

  if (node.body.type !== "BlockStatement") return isTickPromise(node.body);
  const last = node.body.body.at(-1);

  return last?.type === "ReturnStatement" && isTickPromise(last.argument);
};

const isWait = (node: ESTree.Node): boolean => {
  if (node.type === "MemberExpression") return isMemberCall(node, "Effect", "yieldNow");

  if (node.type === "AwaitExpression") return isTickPromise(node.argument);

  if (node.type !== "CallExpression") return false;

  if (isMemberCall(node.callee, "Effect", "sleep")) return true;

  if (isIdentifierNamed(node.callee, tickTimers)) return true;

  return isMemberCall(node.callee, "Effect", "promise") && thunkReturnsTick(node.arguments[0]);
};

const exits = (node: ESTree.Node): boolean =>
  node.type === "ReturnStatement" ||
  node.type === "BreakStatement" ||
  node.type === "ThrowStatement";

const hasConditionalExit = (body: ESTree.Node): boolean =>
  someDescendant(
    body,
    (node) =>
      node.type === "IfStatement" &&
      (someDescendant(node.consequent, exits) || someDescendant(node.alternate, exits)),
  );

const isBound = (node: ESTree.Node): boolean => {
  const expression = unwrap(node);

  return (
    expression?.type === "Identifier" ||
    (expression?.type === "Literal" && typeof expression.value === "number")
  );
};

const advances = (node: ESTree.Node | null | undefined, name: string): boolean =>
  someDescendant(node, (child) => {
    if (child.type === "UpdateExpression") {
      const argument = unwrap(child.argument);

      return argument?.type === "Identifier" && argument.name === name;
    }

    if (
      child.type !== "AssignmentExpression" ||
      (child.operator !== "+=" && child.operator !== "-=")
    ) {
      return false;
    }

    const left = unwrap(child.left);

    return left?.type === "Identifier" && left.name === name;
  });

const isCounterTest = (loop: Loop): boolean => {
  const test = unwrap(loop.test);

  if (test?.type !== "BinaryExpression" || !counterOperators.has(test.operator)) return false;

  const pairs = [
    [test.left, test.right],
    [test.right, test.left],
  ] as const;

  return pairs.some(([counter, bound]) => {
    const name = unwrap(counter);

    if (name?.type !== "Identifier" || !isBound(bound)) return false;

    return (
      advances(loop.body, name.name) ||
      (loop.type === "ForStatement" && advances(loop.update, name.name))
    );
  });
};

const isTrue = (node: ESTree.Node | null | undefined): boolean => {
  const expression = unwrap(node);

  return expression?.type === "Literal" && expression.value === true;
};

const hasPredicateExit = (loop: Loop): boolean =>
  hasConditionalExit(loop.body) ||
  (loop.test !== null && loop.test !== undefined && !isTrue(loop.test) && !isCounterTest(loop));

export const noPollingLoopInTestsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow loops in tests that spin on sleeps or ticks until a predicate holds; await the milestone instead.",
    },
    messages: {
      polling: `Polling loop in a test: how many turns it takes depends on the scheduler and the machine's load. Await what marks the milestone instead: a Deferred, \`Queue.take\`, a Stream element, \`vi.waitFor\` or Testing Library's \`findBy*\` ${seeTestingDoc}.`,
    },
    schema: [],
  },
  create(context) {
    if (!testFilePattern.test(context.filename)) return {};

    const check = (loop: Loop): void => {
      if (!someDescendant(loop.body, isWait) || !hasPredicateExit(loop)) return;
      context.report({ node: loop, messageId: "polling" });
    };

    return {
      ForStatement: check,
      WhileStatement: check,
      DoWhileStatement: check,
    };
  },
});
