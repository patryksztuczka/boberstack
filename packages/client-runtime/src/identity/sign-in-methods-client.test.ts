import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { ApiOrigin } from "../api-origin/index.ts";
import { SignInMethodsClient, SignInMethodsHttpClientLayer } from "./sign-in-methods-client.ts";

describe("SignInMethodsHttpClientLayer", () => {
  it.effect("reads the sign-in methods from the api origin", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);

      const api = Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request, url) =>
          Ref.update(urls, (seen) => [...seen, url.href]).pipe(
            Effect.as(
              HttpClientResponse.fromWeb(
                request,
                new Response(
                  JSON.stringify({ emailVerificationRequired: true, socialProviders: ["github"] }),
                  { status: 200, headers: { "content-type": "application/json" } },
                ),
              ),
            ),
          ),
        ),
      );

      const methods = yield* SignInMethodsClient.use((client) => client.list).pipe(
        Effect.provide(
          SignInMethodsHttpClientLayer.pipe(
            Layer.provide([ApiOrigin.layer("http://api.test"), api]),
          ),
        ),
      );

      assert.deepStrictEqual(yield* Ref.get(urls), ["http://api.test/api/sign-in-methods"]);
      assert.deepStrictEqual(methods.socialProviders, ["github"]);
    }),
  );
});
