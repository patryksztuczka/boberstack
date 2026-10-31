import { defineRule } from "vite-plus/lint/plugins";

import { hasMarkedReason } from "../shared/ast.ts";
import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const runners = new Map<string, ReadonlySet<string>>([
  [
    "Effect",
    new Set(["runPromise", "runPromiseExit", "runSync", "runSyncExit", "runFork", "runCallback"]),
  ],
  ["NodeRuntime", new Set(["runMain"])],
  ["BunRuntime", new Set(["runMain"])],
  ["ManagedRuntime", new Set(["make"])],
]);

const bridges = new Map<string, ReadonlySet<string>>([
  [
    "Effect",
    new Set([
      "runPromiseWith",
      "runPromiseExitWith",
      "runSyncWith",
      "runSyncExitWith",
      "runForkWith",
      "runCallbackWith",
    ]),
  ],
]);

const defaultAllow = [
  "apps/api/src/worker.ts",
  "apps/cli/src/main.ts",
  "apps/web/src/runtime.ts",
  "apps/infra/alchemy.run.ts",
  "**/vitest.global-setup.ts",
];

const defaultTests = ["**/*.test.ts", "**/*.test.tsx"];

const defaultMarker = "BRIDGE:";

export const runOnlyInEntryPointsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Restrict starting Effect runtimes to configured entry points." },
    messages: {
      notEntry:
        "`{{call}}` starts a runtime. Only entry points may do that (see the rule's `allow` list); export an Effect or a Layer from here instead (see .agents/skills/effect-v4/references/10-runtimes-and-entry-points.md).",
      unmarkedBridge:
        "`{{call}}` runs an Effect from outside Effect. Only a library that calls back through Promises needs that: name it and why in a `// {{marker}} …` comment directly above, or keep the code in Effect (see .agents/skills/effect-v4/references/10-runtimes-and-entry-points.md).",
      inTests:
        "`{{call}}` bypasses @effect/vitest. Use `it.effect` / `layer(…)` so the test gets TestClock and a scope (see .agents/skills/effect-v4/references/11-testing.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" } },
          tests: { type: "array", items: { type: "string" } },
          marker: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allow: defaultAllow, tests: defaultTests, marker: defaultMarker }],
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const member = effectMember(context.sourceCode, node);

        if (member === undefined) return;
        const runner = runners.get(member.module)?.has(member.member) === true;
        const bridge = bridges.get(member.module)?.has(member.member) === true;

        if (!runner && !bridge) return;

        const options = ruleOptions(context, {
          allow: defaultAllow,
          tests: defaultTests,
          marker: defaultMarker,
        });

        const relative = relativeFilename(context);

        if (matchesAny(relative, options.allow)) return;

        if (bridge && hasMarkedReason(context.sourceCode, node, options.marker)) return;
        const call = `${member.module}.${member.member}`;

        const messageId = matchesAny(relative, options.tests)
          ? "inTests"
          : bridge
            ? "unmarkedBridge"
            : "notEntry";

        context.report({ node, messageId, data: { call, marker: options.marker } });
      },
    };
  },
});
