import { TodosRpcs } from "@boberstack/domain/todos/todos.rpc";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { RpcClient, RpcSerialization } from "effect/rpc";

import { TodosUnavailableError } from "./todos-client.errors.ts";
import { TodosClient } from "./todos-client.ts";

const unavailable = (error: { readonly message: string }) =>
  Effect.fail(new TodosUnavailableError({ reason: error.message }));

const RpcProtocolLayer = RpcClient.layerProtocolHttp({
  url: new URL("/api/rpc", globalThis.location.origin).href,
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]));

export const TodosRpcClientLayer = Layer.effect(
  TodosClient,
  Effect.gen(function* () {
    const client = yield* RpcClient.make(TodosRpcs);

    return TodosClient.of({
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
