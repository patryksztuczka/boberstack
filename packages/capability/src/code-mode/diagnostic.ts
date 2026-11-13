import { Option, Schema } from "effect";

export const SandboxDiagnostic = Schema.Struct({
  kind: Schema.Literals([
    "ParseError",
    "ExecutionFailure",
    "UnknownTool",
    "InvalidToolInput",
    "InvalidToolOutput",
    "InvalidDataValue",
    "ToolFailure",
    "TimeoutExceeded",
    "ToolCallLimitExceeded",
    "HostFailure",
  ]),
  message: Schema.String,
  tag: Schema.optional(Schema.String),
});

const MAX_MESSAGE_LENGTH = 512;

export const modelSafeMessage = (message: string): string =>
  message
    .replaceAll(/\/(?:Users|home|private|tmp|var\/folders)\/[^\s"'`]+/gu, "<redacted-path>")
    .slice(0, MAX_MESSAGE_LENGTH);

const FailureInfo = Schema.Struct({
  _tag: Schema.optionalKey(Schema.String),
  message: Schema.optionalKey(Schema.String),
});

const decodeFailureInfo = Schema.decodeUnknownOption(FailureInfo);

export const toolDiagnostic = (cause: unknown): typeof SandboxDiagnostic.Type =>
  Option.match(decodeFailureInfo(cause), {
    onNone: () => ({ kind: "ToolFailure", message: "Capability execution failed" }),
    onSome: ({ _tag, message }) => ({
      kind: "ToolFailure",
      message: modelSafeMessage(
        message ?? `Capability failed${_tag === undefined ? "" : ` (${_tag})`}`,
      ),
      tag: _tag,
    }),
  });
