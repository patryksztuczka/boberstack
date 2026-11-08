import { McpAuthenticationLayer } from "@boberstack/auth";
import { TodosToolkit } from "@boberstack/domain/todos/todos.mcp";
import { Layer } from "effect";
import { McpProtocol, McpServer } from "effect/ai";

import { TodosMcpLayer } from "./todos.mcp.ts";

const McpTransportLayer = McpServer.layerHttpRequestScoped({
  name: "boberstack",
  version: "1.0.0",
  path: "/api/mcp",
  protocols: [McpProtocol.v2026_07_28],
}).pipe(Layer.orDie, Layer.provide(McpAuthenticationLayer));

export const McpLayer = McpServer.toolkit(TodosToolkit).pipe(
  Layer.provide(TodosMcpLayer),
  Layer.provide(McpTransportLayer),
);
