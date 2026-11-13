import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Exit, Layer, Option, Schema, Stream } from "effect";
import { Tool } from "effect/ai";
import { RpcTest } from "effect/rpc";

import { toRpcGroup, toRpcHandlers } from "../rpc.ts";
import { BookId } from "../testing/shelf-id.ts";
import { Library, Reader, ShelfCapabilities } from "../testing/shelf.ts";
import { invokerFor, toCodeMode, toCodeModeHandlers } from "./code-mode.ts";
import type { CodeModeToolkit } from "./code-mode.ts";
import { SandboxDiagnostic } from "./diagnostic.ts";
import { ExecuteError } from "./sandbox.errors.ts";
import { Sandbox } from "./sandbox.ts";
import { layerSubprocess } from "./subprocess-sandbox.ts";
import { StorageBudgetExceededError } from "./testing/fixtures.errors.ts";
import {
  Greeter,
  ProgramStorage,
  checkedInput,
  echo,
  greet,
  noArgs,
  primitiveFailure,
  storage,
} from "./testing/fixtures.ts";

const SandboxLayer = layerSubprocess({ timeout: "5 seconds" }).pipe(
  Layer.provide(NodeServices.layer),
);

const projection = toCodeMode([echo, greet]);

const [, execute] = projection.capabilities;

const AppLayer = toCodeModeHandlers(projection).pipe(
  Layer.provide(Greeter.layer),
  Layer.provide(SandboxLayer),
);

const handle = <Name extends "search" | "execute">(
  toolkit: CodeModeToolkit,
  name: Name,
  params: Tool.ParametersEncoded<CodeModeToolkit["tools"][Name]>,
) =>
  Effect.gen(function* () {
    const handlers = yield* toolkit;
    const results = yield* handlers.handle(name, params);
    const last = yield* Stream.runLast(results);

    return Option.map(last, ({ encodedResult }) => encodedResult);
  });

const call = <Name extends "search" | "execute">(
  name: Name,
  params: Tool.ParametersEncoded<CodeModeToolkit["tools"][Name]>,
) => handle(projection.toolkit, name, params);

describe("toCodeMode", () => {
  it("keeps empty and checked input schemas in the catalog", () => {
    const checked = toCodeMode([checkedInput]);
    const empty = toCodeMode([noArgs]);

    assert.containSubset(checked.catalog.capabilities[0]?.input, {
      properties: { mode: { enum: ["fast", "slow"] }, values: { maxItems: 3, minItems: 1 } },
      type: "object",
    });
    assert.include(
      checked.declarations,
      'readonly checkedInput: (input: { readonly mode: "fast" | "slow"; readonly values: ReadonlyArray<string> }) => Promise<string>;',
    );
    assert.deepStrictEqual(empty.catalog.capabilities[0]?.input, {
      properties: {},
      type: "object",
    });
    assert.include(empty.declarations, "readonly noArgs: (input: {}) => Promise<string>;");
  });

  it("projects exactly search and execute, with the declarations in execute", () => {
    const { search, execute: executeTool } = projection.toolkit.tools;

    assert.deepStrictEqual(Object.keys(projection.toolkit.tools), ["search", "execute"]);
    assert.include(executeTool.description, "COMPLETE");
    assert.include(executeTool.description, "declare const tools: {");
    assert.include(executeTool.description, "readonly greet:");
    assert.notInclude(executeTool.description, "$codemode.search");
    assert.deepStrictEqual(
      Context.getOption(executeTool.annotations, Tool.Title),
      Option.some("Run a program"),
    );
    assert.strictEqual(Context.get(executeTool.annotations, Tool.Readonly), false);
    assert.strictEqual(Context.get(executeTool.annotations, Tool.Destructive), false);
    assert.strictEqual(Context.get(search.annotations, Tool.Readonly), true);
    assert.strictEqual(Context.get(search.annotations, Tool.Idempotent), true);
  });

  it("marks execute read-only only when every capability is", () => {
    const readOnly = toCodeMode([echo]).toolkit.tools.execute;

    assert.strictEqual(Context.get(readOnly.annotations, Tool.Readonly), true);
  });

  it("leaves the declarations out of execute when search serves them", () => {
    const { declarations, toolkit } = toCodeMode([echo, greet], { declarations: "search" });
    const { description } = toolkit.tools.execute;

    assert.notInclude(description, "declare const tools");
    assert.include(description, "Call `search` first");
    assert.include(declarations, "readonly greet:");
  });
});

describe("toCodeModeHandlers", () => {
  it.layer(AppLayer)((it) => {
    it.effect("search returns ranked signatures", () =>
      Effect.gen(function* () {
        const result = yield* call("search", { query: "repeat text" });

        assert.containSubset(Option.getOrUndefined(result), {
          matches: [{ name: "echo" }],
          total: 2,
        });
      }),
    );

    it.effect("search pages outside and inside the program with the same cursor", () =>
      Effect.gen(function* () {
        const first = yield* call("search", { limit: 1, query: "" });
        const last = yield* call("search", { limit: 1, offset: 1, query: "" });

        const inside = yield* call("execute", {
          code: 'return await tools.$codemode.search({ query: "", limit: 1, offset: 1 });',
        });

        assert.containSubset(Option.getOrUndefined(first), {
          matches: [{ name: "echo" }],
          next: { offset: 1 },
          offset: 0,
          remaining: 1,
        });
        assert.containSubset(Option.getOrUndefined(last), {
          matches: [{ name: "greet" }],
          next: null,
          offset: 1,
          remaining: 0,
        });
        assert.containSubset(Option.getOrUndefined(inside), {
          result: Option.getOrUndefined(last),
        });
      }),
    );

    it.effect("lists the callable tools and calls one by a discovered name", () =>
      Effect.gen(function* () {
        const result = yield* call("execute", {
          code: 'const names = Object.keys(tools); const callable = names.find((name) => name === "echo"); return { names, value: await tools[callable]({ text: "bob", times: 2 }) };',
        });

        assert.containSubset(Option.getOrUndefined(result), {
          result: { names: ["echo", "greet"], value: { text: "bobbob" } },
        });
      }),
    );

    it.effect("runs a program that calls capabilities through their schemas", () =>
      Effect.gen(function* () {
        const result = yield* call("execute", {
          code: [
            "const hello = await tools.greet({ name: 'bob' });",
            "const twice = await tools.echo({ text: hello.greeting, times: 2 });",
            "let caught;",
            "try { await tools.greet({ name: 'nobody' }); } catch (error) { caught = error._tag; }",
            "let invalid;",
            "try { await tools.echo({ text: 42 }); } catch (error) { invalid = error._tag; }",
            "console.log('done');",
            "return { twice: twice.text, caught, invalid };",
          ].join("\n"),
        });

        assert.deepStrictEqual(Option.getOrUndefined(result), {
          logs: ["log: done"],
          result: { caught: "NotFoundError", invalid: "InvalidInput", twice: "hello bobhello bob" },
          toolCalls: ["greet", "echo", "greet", "echo"],
          truncated: false,
        });
      }),
    );

    it.effect("fails execute with an ExecuteError when the program throws", () =>
      Effect.gen(function* () {
        const failure = yield* call("execute", { code: "throw new Error('nope')" }).pipe(
          Effect.flip,
        );

        assert.isTrue(Schema.is(ExecuteError)(failure));
        assert.containSubset(failure, { kind: "ExecutionFailure", message: "nope" });
      }),
    );
  });

  const shelf = toCodeMode(ShelfCapabilities);

  const ShelfLayer = toCodeModeHandlers(shelf, [Reader]).pipe(
    Layer.provide(Library.layer),
    Layer.provide(SandboxLayer),
  );

  const borrow = handle(shelf.toolkit, "execute", {
    code: `return await tools.borrowBook({ id: ${JSON.stringify(BookId.make("dune"))} });`,
  });

  it.layer(ShelfLayer)("with a per-request service", (it) => {
    it.effect("reaches a capability the program calls with the caller's service", () =>
      Effect.gen(function* () {
        const result = yield* borrow.pipe(
          Effect.provideService(Reader, Reader.of({ name: "Ada" })),
        );

        assert.containSubset(Option.getOrUndefined(result), { result: { borrower: "Ada" } });
      }),
    );

    it.effect("dies naming the per-request service the transport did not provide", () =>
      Effect.gen(function* () {
        const exit = yield* borrow.pipe(Effect.exit);

        assert.strictEqual(Exit.isFailure(exit), true);
        assert.include(String(exit), "boberstack/capability/testing/Reader");
      }),
    );
  });
});

describe("execute", () => {
  it.effect.prop(
    "turns every sandbox diagnostic into an ExecuteError with its receipts",
    {
      diagnostic: SandboxDiagnostic,
      logs: Schema.Array(Schema.String),
      truncated: Schema.Boolean,
    },
    ({ diagnostic, logs, truncated }) =>
      Effect.gen(function* () {
        const failure = yield* execute.handler({ code: "program" }).pipe(Effect.flip);

        assert.strictEqual(Schema.is(ExecuteError)(failure), true);
        assert.containSubset(failure, { ...diagnostic, logs, toolCalls: ["echo"], truncated });
      }).pipe(
        Effect.provide(Greeter.layer),
        Effect.provideService(
          Sandbox,
          Sandbox.of({
            run: () =>
              Effect.succeed({ diagnostic, logs, result: null, toolCalls: ["echo"], truncated }),
          }),
        ),
      ),
  );

  class ExecuteRpcs extends toRpcGroup([execute.contract]) {}

  const RpcLayer = Layer.mergeAll(toRpcHandlers(ExecuteRpcs, [execute]), AppLayer).pipe(
    Layer.provide(Greeter.layer),
    Layer.provide(SandboxLayer),
  );

  it.layer(RpcLayer)((it) => {
    it.effect.prop(
      "a program succeeds or fails the same way through the toolkit and RPC",
      {
        fails: Schema.Boolean,
        value: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000 })),
      },
      ({ fails, value }) =>
        Effect.gen(function* () {
          const message = `program failed ${value}`;
          const code = `console.log("before"); ${fails ? `throw new Error(${JSON.stringify(message)})` : `return ${value}`};`;
          const client = yield* RpcTest.makeClient(ExecuteRpcs);
          const viaRpc = yield* client.execute({ code }).pipe(Effect.exit);
          const viaToolkit = yield* call("execute", { code }).pipe(Effect.exit);

          assert.strictEqual(Exit.isFailure(viaRpc), fails);
          assert.strictEqual(Exit.isFailure(viaToolkit), fails);

          if (Exit.isSuccess(viaRpc)) {
            assert.containSubset(viaRpc.value, { logs: ["log: before"], result: value });
          }

          const checkFailure = <E>(failure: Option.Option<E>) => {
            assert.strictEqual(Option.exists(failure, Schema.is(ExecuteError)), fails);
            assert.containSubset(
              Option.getOrUndefined(failure),
              fails ? { kind: "ExecutionFailure", logs: ["log: before"], message } : undefined,
            );
          };

          checkFailure(Exit.findErrorOption(viaRpc));
          checkFailure(Exit.findErrorOption(viaToolkit));
        }),
      { arbitrary: { runs: 4 } },
    );
  });
});

describe("invokerFor", () => {
  it.effect.prop(
    "keeps a primitive declared failure and gives it a usable diagnostic",
    { reason: Schema.String },
    ({ reason }) =>
      Effect.gen(function* () {
        const invoke = yield* invokerFor([primitiveFailure]);
        const outcome = yield* invoke("primitiveFailure", { reason });

        assert.containSubset(outcome, { error: reason, ok: false });
        assert.strictEqual(outcome.ok ? undefined : outcome.diagnostic?.kind, "ToolFailure");
        assert.match((outcome.ok ? undefined : outcome.diagnostic?.message) ?? "", /\S/u);
      }),
  );

  it.effect.prop(
    "each invoker keeps the services it captured and the declared failure",
    {
      budget: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 100 })),
      label: Schema.String,
    },
    ({ budget, label }) =>
      Effect.gen(function* () {
        const first = yield* invokerFor([storage]).pipe(
          Effect.provideService(ProgramStorage, ProgramStorage.of({ budget, label })),
        );

        const second = yield* invokerFor([storage]).pipe(
          Effect.provideService(
            ProgramStorage,
            ProgramStorage.of({ budget: budget + 1, label: `${label}:second` }),
          ),
        );

        const exhausted = new StorageBudgetExceededError({
          message: "The storage statement budget is exhausted",
        });

        assert.deepStrictEqual(yield* first("storage", { statements: budget }), {
          ok: true,
          value: label,
        });
        assert.deepStrictEqual(yield* second("storage", { statements: budget + 1 }), {
          ok: true,
          value: `${label}:second`,
        });
        assert.containSubset(yield* first("storage", { statements: budget + 1 }), {
          diagnostic: {
            kind: "ToolFailure",
            message: "The storage statement budget is exhausted",
            tag: "StorageBudgetExceededError",
          },
          error: yield* Schema.encodeEffect(StorageBudgetExceededError)(exhausted),
          ok: false,
        });
      }),
  );

  it.effect("answers an unknown capability with a typed outcome", () =>
    Effect.gen(function* () {
      const invoke = yield* invokerFor([echo]);
      const outcome = yield* invoke("missing", {});

      assert.containSubset(outcome, {
        diagnostic: { kind: "UnknownTool", tag: "UnknownCapability" },
        ok: false,
      });
    }),
  );
});
