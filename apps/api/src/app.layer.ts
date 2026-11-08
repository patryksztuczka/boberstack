import { TodosService } from "@boberstack/core/todos";
import { TodoRepositoryLayer } from "@boberstack/database";
import { Layer } from "effect";

import { HttpLayer } from "./http/http.layer.ts";
import { RpcLayer } from "./rpc/rpc.layer.ts";

export const AppLayer = Layer.mergeAll(HttpLayer, RpcLayer).pipe(
  Layer.provide(TodosService.layer),
  Layer.provide(TodoRepositoryLayer),
);
