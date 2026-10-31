import { Layer } from "effect";

import { HttpLayer } from "./http/http.layer.ts";
import { TodosService } from "./modules/todos/index.ts";
import { TodoRepositoryLayer } from "./platform/database/todo.repository.ts";
import { RpcLayer } from "./rpc/rpc.layer.ts";

export const AppLayer = Layer.mergeAll(HttpLayer, RpcLayer).pipe(
  Layer.provide(TodosService.layer),
  Layer.provide(TodoRepositoryLayer),
);
