import { Api } from "@boberstack/domain/api";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { TodosUnavailableError } from "./todos-client.errors.ts";
import { TodosClient } from "./todos-client.ts";

const unavailable = (error: { readonly message: string }) =>
  Effect.fail(new TodosUnavailableError({ reason: error.message }));

export const TodosHttpClientLayer = Layer.effect(
  TodosClient,
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(Api, { baseUrl: globalThis.location.origin });

    return TodosClient.of({
      list: client.todos.list().pipe(
        Effect.catchTags({
          HttpClientError: unavailable,
          SchemaError: unavailable,
          AuthenticationUnavailableError: unavailable,
        }),
      ),
      create: (payload) =>
        client.todos.create({ payload }).pipe(
          Effect.catchTags({
            HttpClientError: unavailable,
            SchemaError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
      update: (id, payload) =>
        client.todos.update({ params: { id }, payload }).pipe(
          Effect.catchTags({
            HttpClientError: unavailable,
            SchemaError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
      remove: (id) =>
        client.todos.remove({ params: { id } }).pipe(
          Effect.asVoid,
          Effect.catchTags({
            HttpClientError: unavailable,
            SchemaError: unavailable,
            AuthenticationUnavailableError: unavailable,
          }),
        ),
    });
  }),
).pipe(Layer.provide(FetchHttpClient.layer));
