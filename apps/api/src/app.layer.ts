import { TodosService } from "@boberstack/core/todos";
import { TodoRepositoryLayer } from "@boberstack/database";
import { Layer } from "effect";

import { HttpLayer } from "./http/http.layer.ts";
import { McpLayer } from "./mcp/mcp.layer.ts";
import { RpcLayer } from "./rpc/rpc.layer.ts";

export const AppLayer = Layer.mergeAll(HttpLayer, RpcLayer, McpLayer).pipe(
  Layer.provide(TodosService.layer),
  Layer.provide(TodoRepositoryLayer),
);
