import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import { HttpClient, HttpClientError } from "effect/http";

import { ApiOrigin } from "../api-origin/index.ts";
import { SessionExpiry } from "../session/index.ts";
import { TodosClient } from "./todos-client.ts";
import { TodosRpcClientLayer } from "./todos-rpc-client.ts";

const apiUnreachable = (urls: Ref.Ref<ReadonlyArray<string>>) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) =>
      Ref.update(urls, (seen) => [...seen, url.href]).pipe(
        Effect.andThen(
          Effect.fail(
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({
                request,
                description: "connection refused",
              }),
            }),
          ),
        ),
      ),
    ),
  );

describe("TodosRpcClientLayer", () => {
  it.effect(
    "calls /api/rpc on the api origin and fails with TodosUnavailableError when it cannot be reached",
    () =>
      Effect.gen(function* () {
        const urls = yield* Ref.make<ReadonlyArray<string>>([]);

        const error = yield* TodosClient.use((client) => client.list).pipe(
          Effect.flip,
          Effect.provide(
            TodosRpcClientLayer.pipe(
              Layer.provide([
                ApiOrigin.layer("http://api.test"),
                apiUnreachable(urls),
                Layer.succeed(SessionExpiry, { expire: Effect.void }),
              ]),
            ),
          ),
        );

        assert.strictEqual(error._tag, "TodosUnavailableError");
        assert.deepStrictEqual(yield* Ref.get(urls), ["http://api.test/api/rpc/"]);
      }),
  );
});
