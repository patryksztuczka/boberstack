import { Schema } from "effect";

export const McpClientId = Schema.String.pipe(Schema.brand("McpClientId"));

export type McpClientId = typeof McpClientId.Type;
