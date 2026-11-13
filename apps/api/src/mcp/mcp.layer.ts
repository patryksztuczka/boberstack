import { McpAuthenticationLayer } from "@boberstack/auth";
import { toToolkitHandlers } from "@boberstack/capability";
import { toCodeMode, toCodeModeHandlers } from "@boberstack/capability/code-mode";
import { CurrentUser } from "@boberstack/domain/identity/current-user";
import { TodosToolkit } from "@boberstack/domain/todos/todos.contracts";
import { Layer } from "effect";
import { McpProtocol, McpServer } from "effect/ai";

import { TodosCapabilities } from "../capabilities/todos.capabilities.ts";

const McpTransportLayer = McpServer.layerHttpRequestScoped({
  name: "boberstack",
  version: "1.0.0",
  path: "/api/mcp",
  protocols: [McpProtocol.v2026_07_28],
}).pipe(Layer.orDie, Layer.provide(McpAuthenticationLayer));

const TodosCodeMode = toCodeMode(TodosCapabilities);

export const McpLayer = Layer.mergeAll(
  McpServer.toolkit(TodosToolkit).pipe(
    Layer.provide(toToolkitHandlers(TodosToolkit, TodosCapabilities, [CurrentUser])),
  ),
  McpServer.toolkit(TodosCodeMode.toolkit).pipe(
    Layer.provide(toCodeModeHandlers(TodosCodeMode, [CurrentUser])),
  ),
).pipe(Layer.provide(McpTransportLayer));
