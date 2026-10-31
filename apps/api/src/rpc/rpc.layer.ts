import { TodosRpcs } from "@boberstack/domain/todos/todos.rpc";
import { Layer } from "effect";
import { RpcSerialization, RpcServer } from "effect/rpc";

import { RpcAuthenticationLayer } from "../platform/authentication/authentication.layer.ts";
import { TodosRpcLayer } from "./todos.rpc.ts";

export const RpcLayer = RpcServer.layerHttp({
  group: TodosRpcs,
  path: "/api/rpc",
  protocol: "http",
}).pipe(Layer.provide([TodosRpcLayer, RpcAuthenticationLayer, RpcSerialization.layerNdjson]));
