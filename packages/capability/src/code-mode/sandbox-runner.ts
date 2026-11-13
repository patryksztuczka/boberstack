import { Cause, Effect, Option, Schema } from "effect";

import { modelSafeMessage } from "./diagnostic.ts";
import type { SandboxDiagnostic } from "./diagnostic.ts";
import { SandboxError } from "./sandbox.errors.ts";
import { invokeFailure, resolveLimits } from "./sandbox.ts";
import type { CheckedRun, Invoke, SandboxLimits, SandboxRun } from "./sandbox.ts";

const encoder = new TextEncoder();

const bytes = (text: string): number => encoder.encode(text).length;

const prefix = (text: string, budget: number, json: boolean): string => {
  let remaining = Math.max(0, budget - (json ? 2 : 0));
  let result = "";

  for (const character of text) {
    const cost = json ? bytes(JSON.stringify(character)) - 2 : bytes(character);

    if (cost > remaining) {
      break;
    }

    result += character;
    remaining -= cost;
  }

  return result;
};

export const boundOutput = (run: CheckedRun, budget?: number): CheckedRun => {
  if (budget === undefined) {
    return { ...run, truncated: run.truncated ?? false };
  }

  const encoded = JSON.stringify(run.result);
  let result: Schema.Json = run.result;
  let used = result === null ? 0 : bytes(encoded);
  let truncated = run.truncated ?? false;

  if (used > budget) {
    result = budget < 2 ? null : prefix(encoded, budget, true);
    used = result === null ? 0 : bytes(JSON.stringify(result));
    truncated = true;
  }

  const logs: string[] = [];

  for (const log of run.logs) {
    const kept = prefix(log, Math.max(0, budget - used), false);

    if (kept !== "" || log === "") {
      logs.push(kept);
    }

    used += bytes(kept);

    if (kept !== log) {
      truncated = true;
      break;
    }
  }

  return { ...run, logs, result, truncated };
};

const diagnosticOf = (error: SandboxError): typeof SandboxDiagnostic.Type => {
  if (error.diagnostic !== undefined) {
    return { ...error.diagnostic, message: modelSafeMessage(error.diagnostic.message) };
  }

  if (error.reason === "timeout") {
    return { kind: "TimeoutExceeded", message: "The program exceeded its execution timeout" };
  }

  if (error.reason === "threw") {
    return { kind: "ExecutionFailure", message: modelSafeMessage(error.message) };
  }

  return { kind: "HostFailure", message: "The sandbox could not complete the program" };
};

const isSandboxError = Schema.is(SandboxError);

const decodeJson = Schema.decodeUnknownEffect(Schema.Json);

export type SandboxProgram = (
  code: string,
  invoke: Invoke,
  names: readonly string[],
) => Effect.Effect<SandboxRun, SandboxError>;

export const sandboxRunner = (run: SandboxProgram, defaults: SandboxLimits = {}) => {
  const configured = resolveLimits(defaults);

  return (
    code: string,
    invoke: Invoke,
    names: readonly string[] = [],
    overrides: SandboxLimits = {},
  ): Effect.Effect<CheckedRun, SandboxError> => {
    const limits = resolveLimits({
      maxOutputBytes: overrides.maxOutputBytes ?? configured.maxOutputBytes,
      maxToolCalls: overrides.maxToolCalls ?? configured.maxToolCalls,
    });

    return Effect.suspend(() => {
      const toolCalls: string[] = [];

      const admitted: Invoke = (name, input) => {
        if (limits.maxToolCalls !== undefined && toolCalls.length >= limits.maxToolCalls) {
          return Effect.succeed({
            ...invokeFailure("ToolCallLimitExceeded", "The program exceeded its tool-call limit"),
            diagnostic: {
              kind: "ToolCallLimitExceeded",
              message: "The program exceeded its tool-call limit",
            },
          });
        }

        toolCalls.push(name);

        return invoke(name, input);
      };

      const admittedCalls = (value: SandboxRun) =>
        value.toolCalls?.slice(0, limits.maxToolCalls) ?? [...toolCalls];

      return run(code, admitted, names).pipe(
        Effect.flatMap((value) =>
          decodeJson(value.result).pipe(
            Effect.map((result): CheckedRun => ({
              ...value,
              diagnostic: value.diagnostic ?? null,
              result,
              toolCalls: admittedCalls(value),
            })),
            Effect.orElseSucceed((): CheckedRun => ({
              diagnostic: {
                kind: "InvalidDataValue",
                message: "Return a JSON-safe value from the program",
              },
              logs: value.logs,
              result: null,
              toolCalls: admittedCalls(value),
            })),
          ),
        ),
        Effect.catchCauseIf(
          (cause) => !Cause.hasInterruptsOnly(cause),
          (cause) => {
            const error = Option.filter(Cause.findErrorOption(cause), isSandboxError);

            return Effect.succeed<CheckedRun>({
              diagnostic: Option.match(error, {
                onNone: (): typeof SandboxDiagnostic.Type =>
                  toolCalls.length > 0
                    ? {
                        kind: "ToolFailure",
                        message: "Capability execution failed",
                        tag: "HostDefect",
                      }
                    : {
                        kind: "HostFailure",
                        message: "The sandbox could not complete the program",
                      },
                onSome: diagnosticOf,
              }),
              logs: Option.match(error, { onNone: () => [], onSome: (failure) => failure.logs }),
              result: null,
              toolCalls: [...toolCalls],
            });
          },
        ),
        Effect.map((outcome) => boundOutput(outcome, limits.maxOutputBytes)),
      );
    });
  };
};
