import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { Atom, AtomRegistry } from "effect/reactivity";

import { ApiOrigin } from "../api-origin/index.ts";
import { clientLayer } from "../atom-runtime/index.ts";
import { SignInMethodsHttpClientLayer } from "../identity/index.ts";
import { todos, TodosHttpClientLayer } from "../todos/index.ts";
import { onSessionExpired, sessionExpiries } from "./session-expiry.ts";

const apiAnswering = (status: number, body: string) =>
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
  );

const registryAnswering = (status: number, body: string) =>
  Effect.acquireRelease(
    Effect.sync(() =>
      AtomRegistry.make({
        initialValues: [
          Atom.initialValue(
            clientLayer,
            Layer.mergeAll(TodosHttpClientLayer, SignInMethodsHttpClientLayer).pipe(
              Layer.provide([ApiOrigin.layer("http://api.test"), apiAnswering(status, body)]),
            ),
          ),
        ],
      }),
    ),
    (registry) => Effect.sync(() => registry.dispose()),
  );

describe("sessionExpiries", () => {
  it.effect("counts a session the api refused, whichever atom made the call", () =>
    Effect.gen(function* () {
      const registry = yield* registryAnswering(401, '{"_tag":"UnauthorizedError"}');

      registry.mount(sessionExpiries);

      const error = yield* AtomRegistry.getResult(registry, todos).pipe(Effect.flip);

      assert.strictEqual(error._tag, "UnauthorizedError");
      assert.strictEqual(registry.get(sessionExpiries), 1);
    }),
  );

  it.effect("tells a watcher once per refused session", () =>
    Effect.gen(function* () {
      const registry = yield* registryAnswering(401, '{"_tag":"UnauthorizedError"}');
      const heard: Array<true> = [];

      yield* Effect.acquireRelease(
        Effect.sync(() => onSessionExpired(registry, () => heard.push(true))),
        (unsubscribe) => Effect.sync(unsubscribe),
      );

      yield* AtomRegistry.getResult(registry, todos).pipe(Effect.flip);

      assert.deepStrictEqual(heard, [true]);
    }),
  );

  it.effect("stays put when the api answers", () =>
    Effect.gen(function* () {
      const registry = yield* registryAnswering(200, "[]");

      yield* AtomRegistry.getResult(registry, todos);

      assert.strictEqual(registry.get(sessionExpiries), 0);
    }),
  );
});
