import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { keyName } from "../../effect/shared/ast.ts";
import {
  calleeChain,
  type CalleeChain,
  enabledKeys,
  functionTypes,
  isIdentifierNamed,
  memberCall,
  seeTestingDoc,
  testFilePattern,
  unwrap,
} from "../shared/test-calls.ts";

const timerModules: ReadonlySet<string> = new Set(["node:timers/promises", "timers/promises"]);

const timers: ReadonlySet<string> = new Set(["setTimeout", "setInterval", "setImmediate"]);

const timerHosts: ReadonlySet<string> = new Set(["globalThis", "window", "global"]);

const sleepHelpers: ReadonlySet<string> = new Set(["sleep", "delay"]);

const testClockDrivers: ReadonlySet<string> = new Set(["adjust", "setTime"]);

const scheduleWaits: ReadonlySet<string> = new Set(["spaced", "fixed", "exponential"]);

const testerRoots: ReadonlySet<string> = new Set(["it", "test"]);

const loops: ReadonlySet<string> = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "WhileStatement",
]);

type Tester = "effect" | "live" | "plain";

const isLayerBlock = (chain: CalleeChain): boolean =>
  chain.root === "layer" || (testerRoots.has(chain.root) && chain.members.includes("layer"));

const testerKind = (chain: CalleeChain): Tester | undefined => {
  if (!testerRoots.has(chain.root) || chain.members.includes("layer")) return undefined;

  if (chain.members.includes("live")) return "live";

  return chain.members.includes("effect") ? "effect" : "plain";
};

const excludesTestServices = (chain: CalleeChain): boolean =>
  chain.calls.some((call) =>
    call.arguments.some((argument) => enabledKeys(argument).includes("excludeTestServices")),
  );

const enclosingTester = (node: ESTree.Node): Tester | undefined => {
  let child: ESTree.Node = node;
  let current = node.parent;
  let tester: Tester | undefined;

  while (current !== null && current !== undefined) {
    if (current.type === "CallExpression" && current.arguments.some((item) => item === child)) {
      const chain = calleeChain(current.callee);

      if (chain !== undefined && tester === undefined) {
        tester = testerKind(chain);

        if (tester !== undefined && tester !== "effect") return tester;
      } else if (chain !== undefined && isLayerBlock(chain) && excludesTestServices(chain)) {
        return "live";
      }
    }

    child = current;
    current = current.parent;
  }

  return tester;
};

const isPollingStep = (node: ESTree.Node): boolean => {
  let statement = node.parent;

  while (
    statement !== null &&
    statement !== undefined &&
    statement.type !== "ExpressionStatement"
  ) {
    if (functionTypes.has(statement.type)) return false;
    statement = statement.parent;
  }

  const block = statement?.parent;

  if (block === null || block === undefined) return false;

  if (loops.has(block.type)) return true;

  return (
    block.type === "BlockStatement" &&
    block.parent !== null &&
    block.parent !== undefined &&
    loops.has(block.parent.type)
  );
};

export const noRealTimeWaitInTestsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow real-clock waits in tests; await the milestone or drive the TestClock instead.",
    },
    messages: {
      realClock: `Real-clock wait in a test: it is slow on a fast machine and flaky on a busy one. Await what marks the milestone (a Deferred, a Queue, \`vi.waitFor\`, Testing Library's \`findBy*\`), or run under \`it.effect\` and move time with \`TestClock.adjust\` ${seeTestingDoc}.`,
      undriven: `\`Effect.sleep\` under \`it.effect\` runs on the TestClock and never fires until the test calls \`TestClock.adjust\`; as written the test can only time out ${seeTestingDoc}.`,
    },
    schema: [],
  },
  create(context) {
    if (!testFilePattern.test(context.filename)) return {};
    let drivesTestClock = false;
    const untilDriven: { node: ESTree.Node; messageId: "realClock" | "undriven" }[] = [];
    const timerLocals = new Set<string>();
    const timerNamespaces = new Set<string>();

    const isTimerCall = (callee: ESTree.Node): boolean => {
      const expression = unwrap(callee);

      if (expression?.type === "Identifier") {
        return timers.has(expression.name) || timerLocals.has(expression.name);
      }

      const member = memberCall(expression);

      if (member === undefined || !timers.has(member[1])) return false;

      return timerHosts.has(member[0]) || timerNamespaces.has(member[0]);
    };

    return {
      ImportDeclaration(node) {
        if (!timerModules.has(node.source.value)) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportNamespaceSpecifier") {
            timerNamespaces.add(specifier.local.name);
          } else if (specifier.type === "ImportSpecifier") {
            const imported = keyName(specifier.imported);

            if (imported !== undefined && timers.has(imported)) {
              timerLocals.add(specifier.local.name);
            }
          }
        }
      },
      CallExpression(node) {
        if (isTimerCall(node.callee)) {
          context.report({ node: node.callee, messageId: "realClock" });

          return;
        }

        if (isIdentifierNamed(node.callee, sleepHelpers) && node.arguments.length > 0) {
          context.report({ node: node.callee, messageId: "realClock" });

          return;
        }

        const member = memberCall(node.callee);

        if (member === undefined) return;
        const [object, property] = member;

        if (object === "TestClock" && testClockDrivers.has(property)) {
          drivesTestClock = true;

          return;
        }

        const isSleep = object === "Effect" && property === "sleep";

        const isWait =
          isSleep ||
          (object === "Effect" && property === "delay") ||
          (object === "Schedule" && scheduleWaits.has(property));

        if (!isWait) return;
        const tester = enclosingTester(node);

        if (tester === undefined) {
          if (isPollingStep(node)) context.report({ node: node.callee, messageId: "realClock" });
          else untilDriven.push({ node: node.callee, messageId: "realClock" });

          return;
        }

        if (tester !== "effect") context.report({ node: node.callee, messageId: "realClock" });
        else if (isSleep) untilDriven.push({ node: node.callee, messageId: "undriven" });
      },
      "Program:exit"() {
        if (drivesTestClock) return;

        for (const report of untilDriven) context.report(report);
      },
    };
  },
});
