import { Duration, Effect, Fiber, Layer, Option, Predicate, Schema, Semaphore } from "effect";

import { SandboxDiagnostic } from "./diagnostic.ts";
import { sandboxRunner } from "./sandbox-runner.ts";
import { SandboxError } from "./sandbox.errors.ts";
import { invokeFailure, Sandbox } from "./sandbox.ts";
import type { Invoke, InvokeOutcome, SandboxLimits, SandboxRun } from "./sandbox.ts";

const GuestOutcome = Schema.Union([
  Schema.Struct({
    logs: Schema.Array(Schema.String),
    ok: Schema.Literal(true),
    result: Schema.Unknown,
  }),
  Schema.Struct({
    diagnostic: Schema.optional(SandboxDiagnostic),
    logs: Schema.Array(Schema.String),
    message: Schema.String,
    ok: Schema.Literal(false),
    timeout: Schema.Boolean,
  }),
]);

export type Dispatch = (name: string, input: Schema.Json) => Promise<InvokeOutcome>;

interface ReleasableStub {
  readonly [Symbol.dispose]?: (() => void) | undefined;
}

export interface DynamicWorkerEntrypoint extends ReleasableStub {
  readonly run: (dispatch: Dispatch) => Promise<typeof GuestOutcome.Encoded>;
}

export interface DynamicWorker extends ReleasableStub {
  readonly getEntrypoint: () => DynamicWorkerEntrypoint;
}

export interface WorkerCode {
  readonly compatibilityDate: string;
  readonly globalOutbound: null;
  readonly limits: { readonly cpuMs: number; readonly subRequests: number };
  readonly mainModule: string;
  readonly modules: Readonly<Record<string, string>>;
}

export interface WorkerLoaderBinding {
  readonly load: (code: WorkerCode) => DynamicWorker;
}

export interface WorkerLoaderOptions extends SandboxLimits {
  readonly compatibilityDate?: string | undefined;
  readonly cpuMs?: number | undefined;
  readonly subRequests?: number | undefined;
  readonly timeout?: Duration.Input | undefined;
}

const TIMEOUT_MESSAGE = "__CODE_MODE_SANDBOX_TIMEOUT__";

const DEFAULT_COMPATIBILITY_DATE = "2026-05-28";

const DEFAULT_SUB_REQUESTS = 5;

const MIN_CPU_MS = 10;

const CALL_CONCURRENCY = 8;

const decodeGuestOutcome = Schema.decodeUnknownEffect(GuestOutcome);

const decodeCallInput = Schema.decodeUnknownOption(Schema.Json);

const messageOf = (cause: unknown): string =>
  Predicate.isError(cause) ? cause.message : String(cause);

const disposeQuietly = (stub: ReleasableStub): Effect.Effect<void> =>
  Effect.try({ try: () => stub[Symbol.dispose]?.(), catch: messageOf }).pipe(Effect.ignore);

const makeDispatch = (invoke: Invoke) =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope;
    const context = yield* Effect.context<never>();
    const semaphore = yield* Semaphore.make(CALL_CONCURRENCY);

    const dispatch: Dispatch = (name, input) => {
      const call = Option.match(decodeCallInput(input), {
        onNone: () => Effect.succeed(invokeFailure("InvalidInput", "Tool input must be JSON")),
        onSome: (json) =>
          semaphore.withPermit(invoke(name, json)).pipe(
            Effect.forkIn(scope),
            Effect.flatMap(Fiber.join),
            Effect.catchCause(() =>
              Effect.succeed(invokeFailure("HostDefect", "Capability execution failed")),
            ),
          ),
      });

      // BRIDGE: the Dynamic Worker calls this function over Workers RPC and awaits the Promise it returns
      return Effect.runPromiseWith(context)(call);
    };

    return dispatch;
  });

const moduleSource = (code: string, timeoutMs: number, names: readonly string[]): string => `
import { WorkerEntrypoint } from "cloudflare:workers";

export default class CodeExecutor extends WorkerEntrypoint {
  async run(dispatch) {
    const logs = [];
    const render = (part) => {
      if (typeof part === "string") return part;
      try { return JSON.stringify(part); } catch { return String(part); }
    };
    const capture = (level) => (...parts) =>
      logs.push(level + ": " + parts.map(render).join(" "));
    const console = {
      debug: capture("debug"), error: capture("error"),
      info: capture("info"), log: capture("log"), warn: capture("warn")
    };
    const names = ${JSON.stringify(names)};
    const tools = new Proxy(Object.create(null), {
      ownKeys: () => names,
      getOwnPropertyDescriptor: (_target, name) =>
        names.includes(name) ? { configurable: true, enumerable: true } : undefined,
      get: (_target, name) => name === "$codemode"
        ? Object.freeze({ search: (input) => tools["$codemode.search"](input) })
        : async (input = {}) => {
        const outcome = await dispatch(String(name), input);
        if (outcome.ok) return outcome.value;
        const error = new Error(outcome.error?.message ?? "capability failed");
        Object.assign(error, outcome.error);
        Object.assign(error, { __codeModeDiagnostic: outcome.diagnostic });
        throw error;
      }
    });

    try {
      const value = await Promise.race([
        (async (tools, console) => { ${code} })(tools, console),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error("${TIMEOUT_MESSAGE}")), ${timeoutMs}
        ))
      ]);
      const result = JSON.parse(JSON.stringify(value === undefined ? null : value));
      return { ok: true, result, logs };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return {
        ok: false,
        diagnostic: cause?.__codeModeDiagnostic,
        message,
        logs,
        timeout: message === "${TIMEOUT_MESSAGE}"
      };
    }
  }
}
`;

const sandboxError = (
  reason: SandboxError["reason"],
  message: string,
  logs: readonly string[] = [],
  diagnostic?: typeof SandboxDiagnostic.Type,
) => new SandboxError({ diagnostic, logs, message, reason });

const parseErrorDiagnostic = (message: string): typeof SandboxDiagnostic.Type | undefined =>
  /SyntaxError|Unexpected token|Unexpected end/iu.test(message)
    ? { kind: "ParseError", message: "The program has invalid JavaScript syntax" }
    : undefined;

const HOST_GRACE = Duration.seconds(1);

export const layerWorkerLoader = (
  binding: WorkerLoaderBinding,
  options: WorkerLoaderOptions = {},
): Layer.Layer<Sandbox> => {
  const timeout = Duration.fromInputUnsafe(options.timeout ?? "10 seconds");
  const timeoutMs = Duration.toMillis(timeout);
  const timeoutMessage = `The program did not finish within ${Duration.format(timeout)}`;

  const load = (code: string, names: readonly string[]) =>
    Effect.try({
      try: () =>
        binding.load({
          compatibilityDate: options.compatibilityDate ?? DEFAULT_COMPATIBILITY_DATE,
          globalOutbound: null,
          limits: {
            cpuMs: options.cpuMs ?? Math.max(MIN_CPU_MS, Math.ceil(timeoutMs / 4)),
            subRequests: options.subRequests ?? DEFAULT_SUB_REQUESTS,
          },
          mainModule: "executor.js",
          modules: { "executor.js": moduleSource(code, timeoutMs, names) },
        }),
      catch: (cause) =>
        sandboxError("exited", `Unable to start Dynamic Worker: ${messageOf(cause)}`),
    });

  const entrypointOf = (worker: DynamicWorker) =>
    Effect.try({
      try: () => worker.getEntrypoint(),
      catch: (cause) =>
        sandboxError("exited", `Unable to open Dynamic Worker entrypoint: ${messageOf(cause)}`),
    });

  const runIn = (entrypoint: DynamicWorkerEntrypoint, invoke: Invoke) =>
    makeDispatch(invoke).pipe(
      Effect.flatMap((dispatch) =>
        Effect.tryPromise({
          try: () => entrypoint.run(dispatch),
          catch: (cause) => {
            const message = messageOf(cause);

            return sandboxError(
              /CPU time limit|timed out/iu.test(message) ? "timeout" : "exited",
              message,
              [],
              parseErrorDiagnostic(message),
            );
          },
        }),
      ),
      Effect.flatMap((outcome) =>
        decodeGuestOutcome(outcome).pipe(
          Effect.mapError((error) =>
            sandboxError("protocol", `Unreadable Dynamic Worker response: ${error.message}`),
          ),
        ),
      ),
      Effect.flatMap((outcome) =>
        outcome.ok
          ? Effect.succeed<SandboxRun>({ logs: outcome.logs, result: outcome.result })
          : Effect.fail(
              sandboxError(
                outcome.timeout ? "timeout" : "threw",
                outcome.timeout ? timeoutMessage : outcome.message,
                outcome.logs,
                outcome.diagnostic,
              ),
            ),
      ),
    );

  const run = (code: string, invoke: Invoke, names: readonly string[]) =>
    Effect.acquireUseRelease(
      load(code, names),
      (worker) =>
        Effect.acquireUseRelease(
          entrypointOf(worker),
          (entrypoint) => runIn(entrypoint, invoke),
          disposeQuietly,
        ),
      disposeQuietly,
    ).pipe(
      Effect.timeoutOrElse({
        duration: Duration.sum(timeout, HOST_GRACE),
        orElse: () => Effect.fail(sandboxError("timeout", timeoutMessage)),
      }),
      Effect.scoped,
    );

  return Layer.succeed(Sandbox, Sandbox.of({ run: sandboxRunner(run, options) }));
};
