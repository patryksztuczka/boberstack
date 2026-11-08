import { ApiOrigin } from "@boberstack/client-runtime/api-origin";
import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import { SignInMethodsHttpClientLayer } from "@boberstack/client-runtime/identity";
import { createTodo, todos, TodosHttpClientLayer } from "@boberstack/client-runtime/todos";
import { TodoTitle } from "@boberstack/domain/todos/todo";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { Atom, AtomRegistry } from "effect/reactivity";

import { watchSessionExpiry } from "./session-expiry.ts";

const apiAnswering = (status: number, body: string) =>
  Layer.mergeAll(TodosHttpClientLayer, SignInMethodsHttpClientLayer).pipe(
    Layer.provide(ApiOrigin.layer("http://api.test")),
    Layer.provide(
      Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request) =>
          Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              new Response(body, { status, headers: { "content-type": "application/json" } }),
            ),
          ),
        ),
      ),
    ),
  );

const watching = (status: number, body: string) =>
  Effect.gen(function* () {
    const expired: Array<true> = [];

    const registry = yield* Effect.acquireRelease(
      Effect.sync(() =>
        AtomRegistry.make({
          initialValues: [Atom.initialValue(clientLayer, apiAnswering(status, body))],
        }),
      ),
      (registry) => Effect.sync(() => registry.dispose()),
    );

    yield* Effect.acquireRelease(
      Effect.sync(() =>
        watchSessionExpiry(registry, async () => {
          expired.push(true);
        }),
      ),
      (unsubscribe) => Effect.sync(unsubscribe),
    );

    return { registry, expired };
  });

describe("watchSessionExpiry", () => {
  it.effect("ends the session when the api refuses the todos list", () =>
    Effect.gen(function* () {
      const { registry, expired } = yield* watching(401, '{"_tag":"UnauthorizedError"}');

      const error = yield* AtomRegistry.getResult(registry, todos).pipe(Effect.flip);

      assert.strictEqual(error._tag, "UnauthorizedError");
      assert.deepStrictEqual(expired, [true]);
    }),
  );

  it.effect("ends the session when the api refuses a mutation", () =>
    Effect.gen(function* () {
      const { registry, expired } = yield* watching(401, '{"_tag":"UnauthorizedError"}');

      registry.mount(createTodo);
      registry.set(createTodo, { title: TodoTitle.make("Write the starter") });

      yield* AtomRegistry.getResult(registry, createTodo).pipe(Effect.flip);

      assert.deepStrictEqual(expired, [true]);
    }),
  );

  it.effect("leaves other failures to the screen", () =>
    Effect.gen(function* () {
      const { registry, expired } = yield* watching(503, "{}");

      const error = yield* AtomRegistry.getResult(registry, todos).pipe(Effect.flip);

      assert.strictEqual(error._tag, "TodosUnavailableError");
      assert.deepStrictEqual(expired, []);
    }),
  );
});
