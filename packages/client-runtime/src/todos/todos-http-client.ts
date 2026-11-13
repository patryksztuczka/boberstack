import { Api } from "@boberstack/domain/api";
import { Effect, Layer } from "effect";
import { HttpApiClient } from "effect/http-api";

import { ApiOrigin } from "../api-origin/index.ts";
import { TodosUnavailableError } from "./todos-client.errors.ts";
import { reportingSessionExpiry, TodosClient } from "./todos-client.ts";

const unavailable = (error: { readonly message: string }) =>
  Effect.fail(new TodosUnavailableError({ reason: error.message }));

export const TodosHttpClientLayer = Layer.effect(
  TodosClient,
  Effect.gen(function* () {
    const { origin } = yield* ApiOrigin;
    const client = yield* HttpApiClient.make(Api, { baseUrl: origin });

    return yield* reportingSessionExpiry({
      list: client.todos.listTodos().pipe(
        Effect.map(({ todos }) => todos),
        Effect.catchTags({
          HttpClientError: unavailable,
          SchemaError: unavailable,
          AuthenticationUnavailableError: unavailable,
        }),
      ),
      create: (payload) =>
        client.todos.createTodo({ payload }).pipe(
          Effect.catchTags({
            HttpClientError: unavailable,
            SchemaError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
      update: (id, payload) =>
        client.todos.updateTodo({ params: { id }, payload }).pipe(
          Effect.catchTags({
            HttpClientError: unavailable,
            SchemaError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
      remove: (id) =>
        client.todos.removeTodo({ params: { id } }).pipe(
          Effect.catchTags({
            HttpClientError: unavailable,
            SchemaError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
    });
  }),
);
