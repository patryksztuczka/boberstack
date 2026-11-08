import { McpClientId } from "@boberstack/domain/identity/mcp-client";
import { Schema } from "effect";

export class McpClientNotFoundError extends Schema.TaggedError<
  McpClientNotFoundError,
  { readonly brand: unique symbol }
>()("McpClientNotFoundError", { clientId: McpClientId }) {}

export class McpClientDirectoryUnavailableError extends Schema.TaggedError<
  McpClientDirectoryUnavailableError,
  { readonly brand: unique symbol }
>()("McpClientDirectoryUnavailableError", { reason: Schema.String }) {}
