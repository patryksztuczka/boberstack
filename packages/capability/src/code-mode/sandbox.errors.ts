import { Schema } from "effect";

import { SandboxDiagnostic } from "./diagnostic.ts";

export class SandboxError extends Schema.TaggedError<
  SandboxError,
  { readonly brand: unique symbol }
>()("SandboxError", {
  diagnostic: Schema.optional(SandboxDiagnostic),
  logs: Schema.Array(Schema.String),
  message: Schema.String,
  reason: Schema.Literals(["exited", "protocol", "threw", "timeout"]),
}) {}

export class ExecuteError extends Schema.TaggedError<
  ExecuteError,
  { readonly brand: unique symbol }
>()(
  "ExecuteError",
  {
    ...SandboxDiagnostic.fields,
    logs: Schema.Array(Schema.String),
    toolCalls: Schema.Array(Schema.String),
    truncated: Schema.Boolean,
  },
  { httpApiStatus: 422 },
) {}

export const ExecuteFailure = Schema.Union([SandboxError, ExecuteError]);
