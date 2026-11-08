import { TodosRpcs } from "@boberstack/domain/todos/todos.rpc";
import { Effect, Layer } from "effect";
import { RpcClient, RpcSerialization } from "effect/rpc";

import { ApiOrigin } from "../api-origin/index.ts";
import { TodosUnavailableError } from "./todos-client.errors.ts";
import { reportingSessionExpiry, TodosClient } from "./todos-client.ts";

const unavailable = (error: { readonly message: string }) =>
  Effect.fail(new TodosUnavailableError({ reason: error.message }));

const RpcProtocolLayer = Layer.unwrap(
  Effect.gen(function* () {
    const { origin } = yield* ApiOrigin;

    return RpcClient.layerProtocolHttp({ url: new URL("/api/rpc", origin).href });
  }),
).pipe(Layer.provide(RpcSerialization.layerNdjson));

export const TodosRpcClientLayer = Layer.effect(
  TodosClient,
  Effect.gen(function* () {
    const client = yield* RpcClient.make(TodosRpcs);

    return yield* reportingSessionExpiry({
      list: client.ListTodos().pipe(
        Effect.catchTags({
          RpcClientError: unavailable,
          AuthenticationUnavailableError: unavailable,
        }),
      ),
      create: (input) =>
        client.CreateTodo(input).pipe(
          Effect.catchTags({
            RpcClientError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
      update: (id, patch) =>
        client.UpdateTodo({ id, patch }).pipe(
          Effect.catchTags({
            RpcClientError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
      remove: (id) =>
        client.RemoveTodo({ id }).pipe(
          Effect.catchTags({
            RpcClientError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
    });
  }),
).pipe(Layer.provide(RpcProtocolLayer));
