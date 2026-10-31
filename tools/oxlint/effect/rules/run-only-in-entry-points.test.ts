import { tester } from "../../rule-tester.ts";
import { runOnlyInEntryPointsRule } from "./run-only-in-entry-points.ts";

const route = "apps/api/src/http/todos.http.ts";

tester.run("effect/run-only-in-entry-points", runOnlyInEntryPointsRule, {
  valid: [
    {
      code: 'import { NodeRuntime } from "@effect/platform-node"; import { Layer } from "effect"; Layer.launch(AppLayer).pipe(NodeRuntime.runMain);',
      filename: "apps/cli/src/main.ts",
    },
    {
      code: 'import { Effect } from "effect"; export default { fetch: (req) => Effect.runPromise(handle(req)) };',
      filename: "apps/api/src/worker.ts",
    },
    {
      code: 'import { Effect } from "effect"; await Effect.runPromise(stack);',
      filename: "apps/infra/alchemy.run.ts",
    },
    {
      code: 'import { ManagedRuntime } from "effect"; export const runtime = ManagedRuntime.make(AppLayer);',
      filename: "apps/web/src/runtime.ts",
    },
    { code: "export const POST = (req) => runtime.runPromise(handle(req));", filename: route },
    {
      code: 'import { ManagedRuntime } from "effect"; const runtime = ManagedRuntime.make(TestPostgres.layer);',
      filename: "vitest.global-setup.ts",
    },
    {
      code: 'import { Effect } from "effect"; Effect.runPromise(program);',
      filename: "apps/api/src/server.ts",
      options: [{ allow: ["apps/api/src/server.ts"] }],
    },
    {
      code: 'import { Effect } from "effect";\n// BRIDGE: the external reader asks for byte ranges through Promises.\nconst run = Effect.runPromiseWith(services);',
      filename: route,
    },
    {
      code: 'import { Effect } from "effect";\nconst read = (start) =>\n  /* BRIDGE: the external reader asks for byte ranges through Promises. */\n  Effect.runPromiseWith(services)(readRange(start));',
      filename: route,
    },
    {
      code: 'import { Effect } from "effect";\ndb.transaction(async (tx) => {\n  // BRIDGE: drizzle runs the body through a Promise callback.\n  const exit = await Effect.runPromiseExitWith(services)(body(tx));\n});',
      filename: route,
    },
    {
      code: 'import { Effect } from "effect";\n// ESCAPE: the clock bridge is handed a forking function.\nconst fork = Effect.runForkWith(context);',
      filename: route,
      options: [{ marker: "ESCAPE:" }],
    },
    {
      code: 'import { Effect } from "effect"; const run = Effect.runPromiseWith(services);',
      filename: "apps/api/src/worker.ts",
    },
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; export const handler = (req) => Effect.runPromise(handle(req));',
      filename: route,
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.runPromise(program);',
      filename: "apps/cli/src/commands/migrate.ts",
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { NodeRuntime } from "@effect/platform-node"; program.pipe(NodeRuntime.runMain);',
      filename: route,
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { ManagedRuntime } from "effect"; const runtime = ManagedRuntime.make(AppLayer);',
      filename: route,
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { Effect } from "effect"; test("matches", async () => { await Effect.runPromise(program); });',
      filename: "apps/api/src/modules/todos/todo.service.test.ts",
      errors: [{ messageId: "inTests" }],
    },
    {
      code: 'import { Effect } from "effect";\nconst run = Effect.runPromiseWith(services);',
      filename: route,
      errors: [{ messageId: "unmarkedBridge" }],
    },
    {
      code: 'import { Effect } from "effect";\n// BRIDGE:\nconst run = Effect.runPromiseWith(services);',
      filename: route,
      errors: [{ messageId: "unmarkedBridge" }],
    },
    {
      code: 'import { Effect } from "effect";\n// BRIDGE: drizzle runs the body through a Promise callback.\n\nconst other = 1;\nconst run = Effect.runForkWith(services);',
      filename: route,
      errors: [{ messageId: "unmarkedBridge" }],
    },
  ],
});
