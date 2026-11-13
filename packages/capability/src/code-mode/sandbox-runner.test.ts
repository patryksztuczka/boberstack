import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { invokerFor } from "./code-mode.ts";
import { sandboxRunner, boundOutput } from "./sandbox-runner.ts";
import { SandboxError } from "./sandbox.errors.ts";
import type { Invoke } from "./sandbox.ts";
import { readFile } from "./testing/fixtures.ts";

const encoder = new TextEncoder();

const sizeOf = (text: string) => encoder.encode(text).length;

describe("boundOutput", () => {
  it.prop(
    "keeps the UTF-8 result and logs within budget without touching the receipts or the diagnostic",
    {
      budget: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 256 })),
      logs: Schema.Array(Schema.String).check(Schema.isMaxLength(8)),
      result: Schema.Json,
    },
    ({ budget, logs, result }) => {
      const diagnostic = { kind: "ToolFailure", message: "safe failure", tag: "Budget" } as const;

      const bounded = boundOutput(
        { diagnostic, logs, result, toolCalls: ["first", "second"] },
        budget,
      );

      const resultSize = bounded.result === null ? 0 : sizeOf(JSON.stringify(bounded.result));
      const logSize = bounded.logs.reduce((sum, log) => sum + sizeOf(log), 0);

      const originalSize =
        (result === null ? 0 : sizeOf(JSON.stringify(result))) +
        logs.reduce((sum, log) => sum + sizeOf(log), 0);

      assert.isAtMost(resultSize + logSize, budget);
      assert.deepStrictEqual(bounded.diagnostic, diagnostic);
      assert.deepStrictEqual(bounded.toolCalls, ["first", "second"]);
      assert.strictEqual(bounded.truncated, originalSize > budget);
    },
  );

  it("removes all content for a zero budget and marks the run truncated", () => {
    assert.deepStrictEqual(
      boundOutput({ logs: ["😀"], result: "value", toolCalls: ["write"] }, 0),
      {
        logs: [],
        result: null,
        toolCalls: ["write"],
        truncated: true,
      },
    );
  });
});

describe("sandboxRunner", () => {
  it.effect.prop(
    "lets only the admitted prefix of calls reach the host and keeps it on a limit failure",
    {
      budget: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 8 })),
      count: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 16 })),
    },
    ({ budget, count }) =>
      Effect.gen(function* () {
        const called: string[] = [];
        const names = Array.from({ length: count }, (_, index) => `call${index}`);

        const invoke: Invoke = (name) =>
          Effect.sync(() => {
            called.push(name);

            return { ok: true, value: null };
          });

        const run = sandboxRunner(
          (_code, dispatch) =>
            Effect.gen(function* () {
              for (const name of names) {
                const outcome = yield* dispatch(name, {});

                if (!outcome.ok) {
                  return yield* new SandboxError({
                    diagnostic: outcome.diagnostic,
                    logs: [],
                    message: "limit",
                    reason: "threw",
                  });
                }
              }

              return { logs: [], result: null };
            }),
          { maxToolCalls: budget },
        );

        const result = yield* run("", invoke, names);

        assert.deepStrictEqual(called, names.slice(0, budget));
        assert.deepStrictEqual(result.toolCalls, called);
        assert.strictEqual(
          result.diagnostic?.kind,
          count > budget ? "ToolCallLimitExceeded" : undefined,
        );
      }),
  );

  it.effect("reports a result that is not JSON as an invalid data value", () =>
    Effect.gen(function* () {
      const run = sandboxRunner(() => Effect.succeed({ logs: [], result: Number.NaN }));
      const result = yield* run("", () => Effect.succeed({ ok: true, value: null }));

      assert.strictEqual(result.diagnostic?.kind, "InvalidDataValue");
      assert.isNull(result.result);
    }),
  );
});

const pathCase = {
  padding: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1500 })),
  prefix: Schema.Literals(["/Users/", "/home/", "/private/", "/tmp/", "/var/folders/"]),
  suffix: Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9/._-]{0,39}$/u)),
};

const messageOf = (prefix: string, suffix: string, padding: number) => {
  const path = `${prefix}${suffix}`;

  return {
    message: `could not read ${path}${padding === 0 ? "" : ` ${"x".repeat(padding)}`}`,
    path,
  };
};

const expectModelSafe = (message: string | undefined, path: string) => {
  assert.include(message, "could not read");
  assert.include(message, "<redacted-path>");
  assert.notInclude(message, path);
  assert.isAtMost(message?.length ?? 0, 512);
};

describe("model-facing diagnostics", () => {
  it.effect.prop(
    "a declared tool failure gives a bounded diagnostic without absolute paths",
    pathCase,
    ({ padding, prefix, suffix }) =>
      Effect.gen(function* () {
        const { message, path } = messageOf(prefix, suffix, padding);
        const invoke = yield* invokerFor([readFile]);
        const outcome = yield* invoke("readFile", { message });

        assert.strictEqual(outcome.ok, false);
        expectModelSafe(outcome.ok ? undefined : outcome.diagnostic?.message, path);
      }),
  );

  it.effect.prop(
    "a program error gives a bounded diagnostic without absolute paths",
    pathCase,
    ({ padding, prefix, suffix }) =>
      Effect.gen(function* () {
        const { message, path } = messageOf(prefix, suffix, padding);

        const run = sandboxRunner(() =>
          Effect.fail(new SandboxError({ logs: [], message, reason: "threw" })),
        );

        const result = yield* run("", () => Effect.succeed({ ok: true, value: null }));

        assert.strictEqual(result.diagnostic?.kind, "ExecutionFailure");
        expectModelSafe(result.diagnostic?.message, path);
      }),
  );
});
