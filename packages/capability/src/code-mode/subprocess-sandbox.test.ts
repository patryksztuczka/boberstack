// @effect-diagnostics unstableApiUsage:off -- the permission-model test spawns node with the sandbox's flags through effect/process, which tsconfig.base.json does not list in allowedUnstableApis yet.
import { NodeHttpServer, NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Exit, Layer, Option, Schema } from "effect";
import { HttpServer, HttpServerResponse } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { toCodeMode } from "./code-mode.ts";
import { ExecuteError } from "./sandbox.errors.ts";
import { invokeFailure, Sandbox } from "./sandbox.ts";
import type { Invoke } from "./sandbox.ts";
import { layerSubprocess, nodeFlags } from "./subprocess-sandbox.ts";
import { ProbeActivity, probe, probeMetrics } from "./testing/fixtures.ts";

const subprocess = (options: Parameters<typeof layerSubprocess>[0]) =>
  layerSubprocess(options).pipe(Layer.provide(NodeServices.layer));

const SandboxLayer = subprocess({ timeout: "5 seconds" });

const TestLayer = Layer.mergeAll(SandboxLayer, ProbeActivity.layer, NodeServices.layer);

const [, execute] = toCodeMode([probe, probeMetrics]).capabilities;

const [, limitedExecute] = toCodeMode([probe, probeMetrics], {
  maxOutputBytes: 128,
  maxToolCalls: 2,
}).capabilities;

const run = (code: string) => execute.handler({ code });

const decodeDouble = Schema.decodeUnknownOption(Schema.Struct({ n: Schema.Finite }));

const invoke: Invoke = (name, input) =>
  Effect.succeed(
    Option.match(name === "double" ? decodeDouble(input) : Option.none(), {
      onNone: () => invokeFailure("UnknownCapability", `no ${name}`),
      onSome: ({ n }) => ({ ok: true, value: { doubled: n * 2 } }),
    }),
  );

const LoopbackServer = HttpServer.serve(
  Effect.sync(() => HttpServerResponse.text("reachable")),
).pipe(Layer.provideMerge(NodeHttpServer.layerTest));

const loopbackUrl = HttpServer.HttpServer.use((server) =>
  Effect.succeed(HttpServer.formatAddress(server.address)),
);

const permissionProbe = (url: string) => `
const results = { env: Object.keys(process.env).filter((key) => key !== "__CF_USER_TEXT_ENCODING") };
const attempt = (name, run) => {
  try { run(); results[name] = "allowed"; } catch (error) { results[name] = error.code ?? String(error); }
};
attempt("read", () => require("node:fs").readFileSync(process.execPath));
attempt("write", () => require("node:fs").writeFileSync("permission-probe.txt", "x"));
attempt("spawn", () => require("node:child_process").spawnSync(process.execPath, ["--version"]));
const done = () => console.log(JSON.stringify(results));
try {
  const { hostname, port } = new URL(${JSON.stringify(url)});
  const socket = require("node:net").connect(Number(port), hostname);
  socket.on("connect", () => { results.connect = "allowed"; socket.destroy(); done(); });
  socket.on("error", (error) => { results.connect = error.code ?? String(error); done(); });
} catch (error) {
  results.connect = error.code ?? String(error);
  done();
}
`;

const PermissionResults = Schema.fromJsonString(
  Schema.Struct({
    env: Schema.Array(Schema.String),
    read: Schema.String,
    write: Schema.String,
    spawn: Schema.String,
    connect: Schema.String,
  }),
);

describe("layerSubprocess", () => {
  it.layer(TestLayer)("runs a program against tools", (it) => {
    it.effect("returns the program's value and its captured logs", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;

        const result = yield* sandbox.run(
          `console.log("start", 1); const a = await tools.double({ n: 2 }); return a.doubled + 1;`,
          invoke,
        );

        assert.strictEqual(result.result, 5);
        assert.deepStrictEqual(result.logs, ["log: start 1"]);
      }),
    );

    it.effect("lets the program catch a capability failure", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;

        const result = yield* sandbox.run(
          `try { await tools.nothing({}); } catch (error) { return error._tag; }`,
          invoke,
        );

        assert.strictEqual(result.result, "UnknownCapability");
      }),
    );

    it.effect("reports a thrown error as an execution failure", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;
        const result = yield* sandbox.run(`throw new Error("boom")`, invoke);

        assert.strictEqual(result.diagnostic?.kind, "ExecutionFailure");
        assert.strictEqual(result.diagnostic?.message, "boom");
      }),
    );

    it.effect("gives the program no process, require, fetch or Function constructor", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;

        const result = yield* sandbox.run(
          `let compiled; try { compiled = new Function("return 1")(); } catch { compiled = "blocked"; } return [typeof process, typeof require, typeof fetch, compiled];`,
          invoke,
        );

        assert.deepStrictEqual(result.result, ["undefined", "undefined", "undefined", "blocked"]);
      }),
    );

    it.effect("blocks constructor chains out of the vm context", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;

        const result = yield* sandbox.run(
          `const pending = tools.double({ n: 1 }); const value = await tools.double({ n: 1 }); let failure; try { await tools.nothing({}); } catch (error) { failure = error; } const probes = []; for (const target of [console.log, pending, value, failure]) { try { probes.push(target.constructor.constructor("return process")().version); } catch { probes.push("blocked"); } } return probes;`,
          invoke,
        );

        assert.deepStrictEqual(result.result, ["blocked", "blocked", "blocked", "blocked"]);
      }),
    );

    it.effect("flushes a multi-megabyte result before the child exits", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;
        const result = yield* sandbox.run(`return "rat".repeat(1750000);`, invoke);

        assert.strictEqual(result.result, "rat".repeat(1_750_000));
      }),
    );

    it.effect(
      "turns a host defect into a sanitised tool failure that keeps the admitted calls",
      () =>
        Effect.gen(function* () {
          const sandbox = yield* Sandbox;

          const result = yield* sandbox.run("return await tools.fail({});", () =>
            Effect.die("private-host-secret"),
          );

          assert.containSubset(result, {
            diagnostic: {
              kind: "ToolFailure",
              message: "Capability execution failed",
              tag: "HostDefect",
            },
            result: null,
            toolCalls: ["fail"],
          });
          assert.notInclude(JSON.stringify(result), "private-host-secret");
        }),
    );

    it.effect("keeps a host interruption an interruption", () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;

        const exit = yield* sandbox
          .run("return await tools.stop({});", () => Effect.interrupt)
          .pipe(Effect.exit);

        assert.strictEqual(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause), true);
      }),
    );

    it.effect("returns the shared success, failure and receipt shapes through execute", () =>
      Effect.gen(function* () {
        const success = yield* run('console.log("start"); return await tools.probe({ value: 7 });');

        assert.deepStrictEqual(success, {
          logs: ["log: start"],
          result: 7,
          toolCalls: ["probe"],
          truncated: false,
        });

        const failure = yield* run(
          "await tools.probe({ value: 1 }); return await tools.probe({ value: 2, fail: true });",
        ).pipe(Effect.flip);

        assert.isTrue(Schema.is(ExecuteError)(failure));
        assert.containSubset(failure, {
          kind: "ToolFailure",
          message: "The storage statement budget is exhausted",
          tag: "StorageBudgetExceededError",
          toolCalls: ["probe", "probe"],
        });

        const invalid = yield* run('return await tools.probe({ value: "private-input" });').pipe(
          Effect.flip,
        );

        assert.containSubset(invalid, {
          kind: "InvalidToolInput",
          tag: "InvalidInput",
          toolCalls: ["probe"],
        });
        assert.notInclude(invalid.message, "private-input");

        const thrown = yield* run(
          'await tools.probe({ value: 1 }); console.log("before"); throw new Error("program failure");',
        ).pipe(Effect.flip);

        assert.containSubset(thrown, {
          kind: "ExecutionFailure",
          logs: ["log: before"],
          message: "program failure",
          toolCalls: ["probe"],
        });

        const parse = yield* run("return (").pipe(Effect.flip);

        assert.containSubset(parse, { kind: "ParseError", toolCalls: [] });

        const network = yield* run('return await fetch("https://example.com");').pipe(Effect.flip);

        assert.containSubset(network, { kind: "ExecutionFailure", toolCalls: [] });
      }),
    );

    it.effect("enforces the call and output limits through execute", () =>
      Effect.gen(function* () {
        const calls = yield* limitedExecute
          .handler({
            code: "await tools.probe({ value: 1 }); await tools.probe({ value: 2 }); return await tools.probe({ value: 3 });",
          })
          .pipe(Effect.flip);

        assert.containSubset(calls, {
          kind: "ToolCallLimitExceeded",
          toolCalls: ["probe", "probe"],
        });

        const output = yield* limitedExecute.handler({
          code: 'console.log("😀".repeat(100)); return "é".repeat(1000);',
        });

        const encoder = new TextEncoder();

        const contentBytes =
          (output.result === null ? 0 : encoder.encode(JSON.stringify(output.result)).length) +
          output.logs.reduce((sum, log) => sum + encoder.encode(log).length, 0);

        assert.isAtMost(contentBytes, 128);
        assert.containSubset(output, { toolCalls: [], truncated: true });

        const failure = yield* limitedExecute
          .handler({
            code: 'console.log("before".repeat(100)); return await tools.probe({ value: 1, fail: true });',
          })
          .pipe(Effect.flip);

        assert.containSubset(failure, {
          kind: "ToolFailure",
          tag: "StorageBudgetExceededError",
          toolCalls: ["probe"],
          truncated: true,
        });
      }),
    );

    it.effect("runs the node subprocess with no file, process or network access", () =>
      Effect.gen(function* () {
        const url = yield* loopbackUrl;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

        const lines = yield* spawner.lines(
          ChildProcess.make(process.execPath, [...nodeFlags(), "-e", permissionProbe(url)], {
            env: {},
            extendEnv: false,
          }),
        );

        const results = yield* Schema.decodeUnknownEffect(PermissionResults)(lines.at(-1));

        assert.deepStrictEqual(results, {
          env: [],
          read: "ERR_ACCESS_DENIED",
          write: "ERR_ACCESS_DENIED",
          spawn: "ERR_ACCESS_DENIED",
          connect: "ERR_ACCESS_DENIED",
        });
      }).pipe(Effect.provide(LoopbackServer)),
    );
  });

  it.live("runs independent calls with a peak concurrency of eight", () =>
    Effect.gen(function* () {
      yield* run("return await tools.probeMetrics({ reset: true });");

      const parallel = yield* run(
        "return await Promise.all(Array.from({ length: 24 }, (_, value) => tools.probe({ value, wait: 20 })));",
      );

      assert.containSubset(parallel, {
        result: Array.from({ length: 24 }, (_, value) => value),
        toolCalls: Array.from({ length: 24 }, () => "probe"),
      });

      const metrics = yield* run("return await tools.probeMetrics({});");

      assert.deepStrictEqual(metrics.result, { active: 0, peak: 8 });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.live("keeps the admitted prefix of a sandbox's own call budget through execute", () =>
    Effect.gen(function* () {
      const failure = yield* run(
        "await tools.probe({ value: 1 }); return await tools.probe({ value: 2 });",
      ).pipe(Effect.flip);

      assert.containSubset(failure, { kind: "ToolCallLimitExceeded", toolCalls: ["probe"] });
    }).pipe(
      Effect.provide(
        Layer.merge(ProbeActivity.layer, subprocess({ maxToolCalls: 1, timeout: "5 seconds" })),
      ),
    ),
  );

  for (const code of [
    "for (;;) {}",
    "await tools.double({ n: 1 }); for (;;) {}",
    "await 0; for (;;) {}",
  ]) {
    it.live(`bounds vm evaluation as a timeout: ${code}`, () =>
      Effect.gen(function* () {
        const sandbox = yield* Sandbox;
        const result = yield* sandbox.run(code, invoke);

        assert.strictEqual(result.diagnostic?.kind, "TimeoutExceeded");
        assert.include(result.diagnostic?.message, "timeout");
      }).pipe(Effect.provide(SandboxLayer)),
    );
  }

  it.live("kills a runaway program at the host timeout", () =>
    Effect.gen(function* () {
      const sandbox = yield* Sandbox;
      const result = yield* sandbox.run(`for (;;) {}`, invoke);

      assert.strictEqual(result.diagnostic?.kind, "TimeoutExceeded");
    }).pipe(Effect.provide(subprocess({ timeout: "300 millis" }))),
  );

  it.live("never loads a module the program imports", () =>
    Effect.gen(function* () {
      const sandbox = yield* Sandbox;

      const result = yield* sandbox.run(
        `try { await import("node:fs"); return "imported"; } catch { return "rejected"; }`,
        invoke,
      );

      assert.isNull(result.result);
      assert.strictEqual(result.diagnostic?.kind, "TimeoutExceeded");
    }).pipe(Effect.provide(subprocess({ timeout: "1 second" }))),
  );

  it.live("fails a program that outgrows the heap limit", () =>
    Effect.gen(function* () {
      const sandbox = yield* Sandbox;

      const result = yield* sandbox.run(
        `const chunks = []; for (;;) { chunks.push("x".repeat(1 << 20) + chunks.length); }`,
        invoke,
      );

      assert.strictEqual(result.diagnostic?.kind, "HostFailure");
      assert.isNull(result.result);
    }).pipe(Effect.provide(subprocess({ maxOldSpaceSizeMb: 16, timeout: "5 seconds" }))),
  );
});
