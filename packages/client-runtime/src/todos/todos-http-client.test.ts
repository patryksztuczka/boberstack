import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";

import { ApiOrigin } from "../api-origin/index.ts";
import { SessionExpiry } from "../session/index.ts";
import { TodosClient } from "./todos-client.ts";
import { TodosHttpClientLayer } from "./todos-http-client.ts";

const origin = "http://api.test";

const storedTodo = {
  id: "3f0c5c1e-8a4b-4c3e-9a51-6f1f2d1b7c10",
  title: "Write the starter",
  completed: false,
  createdAt: "2026-10-30T09:00:00.000Z",
};

const json = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });

const apiAnswering = (urls: Ref.Ref<ReadonlyArray<string>>, response: () => Response) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) =>
      Ref.update(urls, (seen) => [...seen, url.href]).pipe(
        Effect.as(HttpClientResponse.fromWeb(request, response())),
      ),
    ),
  );

const apiUnreachable = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.fail(
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({ request, description: "connection refused" }),
      }),
    ),
  ),
);

const sessionExpiry = (expiries: Ref.Ref<number>) =>
  Layer.succeed(SessionExpiry, { expire: Ref.update(expiries, (count) => count + 1) });

const todosClient = (
  httpClient: Layer.Layer<HttpClient.HttpClient>,
  expiry: Layer.Layer<SessionExpiry> = Layer.succeed(SessionExpiry, { expire: Effect.void }),
) => TodosHttpClientLayer.pipe(Layer.provide([ApiOrigin.layer(origin), httpClient, expiry]));

describe("TodosHttpClientLayer", () => {
  it.effect("lists the todos from the api origin", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);

      const todos = yield* TodosClient.use((client) => client.list).pipe(
        Effect.provide(
          todosClient(apiAnswering(urls, () => json(200, JSON.stringify({ todos: [storedTodo] })))),
        ),
      );

      assert.deepStrictEqual(yield* Ref.get(urls), ["http://api.test/api/todos"]);
      assert.deepStrictEqual(
        todos.map((todo) => todo.title),
        ["Write the starter"],
      );
    }),
  );

  it.effect("passes a refused session through as UnauthorizedError and reports it", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);
      const expiries = yield* Ref.make(0);

      const error = yield* TodosClient.use((client) => client.list).pipe(
        Effect.flip,
        Effect.provide(
          todosClient(
            apiAnswering(urls, () => json(401, '{"_tag":"UnauthorizedError"}')),
            sessionExpiry(expiries),
          ),
        ),
      );

      assert.strictEqual(error._tag, "UnauthorizedError");
      assert.strictEqual(yield* Ref.get(expiries), 1);
    }),
  );

  it.effect("reports nothing when the api cannot be reached", () =>
    Effect.gen(function* () {
      const expiries = yield* Ref.make(0);

      yield* TodosClient.use((client) => client.list).pipe(
        Effect.flip,
        Effect.provide(todosClient(apiUnreachable, sessionExpiry(expiries))),
      );

      assert.strictEqual(yield* Ref.get(expiries), 0);
    }),
  );

  it.effect("fails with TodosUnavailableError when the api cannot be reached", () =>
    Effect.gen(function* () {
      const error = yield* TodosClient.use((client) => client.list).pipe(
        Effect.flip,
        Effect.provide(todosClient(apiUnreachable)),
      );

      assert.strictEqual(error._tag, "TodosUnavailableError");
    }),
  );
});
