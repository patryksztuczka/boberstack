import { Context, Match } from "effect";
import type { Effect, Schema } from "effect";

import { modelSafeMessage } from "./diagnostic.ts";
import type { SandboxDiagnostic } from "./diagnostic.ts";
import type { SandboxError } from "./sandbox.errors.ts";

export type InvokeOutcome =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly error: unknown;
      readonly diagnostic?: typeof SandboxDiagnostic.Type | undefined;
    };

export type Invoke = (name: string, input: Schema.Json) => Effect.Effect<InvokeOutcome>;

export interface SandboxRun {
  readonly result: unknown;
  readonly logs: readonly string[];
  readonly diagnostic?: typeof SandboxDiagnostic.Type | null | undefined;
  readonly toolCalls?: readonly string[] | undefined;
  readonly truncated?: boolean | undefined;
}

export interface CheckedRun extends SandboxRun {
  readonly result: Schema.Json;
}

export interface SandboxLimits {
  readonly maxToolCalls?: number | undefined;
  readonly maxOutputBytes?: number | undefined;
}

export class Sandbox extends Context.Service<
  Sandbox,
  {
    readonly run: (
      code: string,
      invoke: Invoke,
      names?: readonly string[],
      limits?: SandboxLimits,
    ) => Effect.Effect<SandboxRun, SandboxError>;
  }
>()("boberstack/capability/code-mode/Sandbox") {}

const checkLimit = (name: string, value: number | undefined): number | undefined => {
  if (value !== undefined && !(Number.isSafeInteger(value) && value >= 0)) {
    throw new Error(`${name} must be a non-negative integer, got ${value}`);
  }

  return value;
};

export const resolveLimits = (limits: SandboxLimits): SandboxLimits => ({
  maxOutputBytes: checkLimit("maxOutputBytes", limits.maxOutputBytes),
  maxToolCalls: checkLimit("maxToolCalls", limits.maxToolCalls),
});

export const invokeFailure = (tag: string, message: string): InvokeOutcome => ({
  diagnostic: {
    kind: Match.value(tag).pipe(
      Match.when("UnknownCapability", () => "UnknownTool" as const),
      Match.when("InvalidInput", () => "InvalidToolInput" as const),
      Match.when("UnencodableOutput", () => "InvalidToolOutput" as const),
      Match.orElse(() => "ToolFailure" as const),
    ),
    message: modelSafeMessage(message),
    tag,
  },
  error: { _tag: tag, message: modelSafeMessage(message) },
  ok: false,
});
