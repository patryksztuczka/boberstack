import { McpClientId } from "@boberstack/domain/identity/mcp-client";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";

import { ApiOrigin } from "../api-origin/index.ts";
import { SessionExpiry } from "../session/index.ts";
import { McpClientDirectory, McpClientDirectoryHttpLayer } from "./mcp-client-directory.ts";

const json = (status: number, body: string) =>
  new Response(body, { status, headers: { "content-type": "application/json" } });

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

const countingExpiries = (expiries: Ref.Ref<number>) =>
  Layer.succeed(SessionExpiry, { expire: Ref.update(expiries, (count) => count + 1) });

const directory = (
  httpClient: Layer.Layer<HttpClient.HttpClient>,
  expiry: Layer.Layer<SessionExpiry> = Layer.succeed(SessionExpiry, { expire: Effect.void }),
) =>
  McpClientDirectoryHttpLayer.pipe(
    Layer.provide([ApiOrigin.layer("http://api.test"), httpClient, expiry]),
  );

const profileOf = (clientId: string) =>
  McpClientDirectory.use((clients) => clients.profileOf(McpClientId.make(clientId)));

describe("McpClientDirectoryHttpLayer", () => {
  it.effect("reads the MCP client's public name from better-auth", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);

      const profile = yield* profileOf("client 1").pipe(
        Effect.provide(
          directory(
            apiAnswering(urls, () =>
              json(200, '{"client_id":"client 1","client_name":"Claude","client_uri":null}'),
            ),
          ),
        ),
      );

      assert.deepStrictEqual(yield* Ref.get(urls), [
        "http://api.test/api/auth/oauth2/public-client?client_id=client+1",
      ]);
      assert.strictEqual(profile.displayName, "Claude");
    }),
  );

  it.effect("falls back to the client id when the MCP client registered no name", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);

      const profile = yield* profileOf("client-1").pipe(
        Effect.provide(directory(apiAnswering(urls, () => json(200, '{"client_id":"client-1"}')))),
      );

      assert.isTrue(Option.isNone(profile.name));
      assert.strictEqual(profile.displayName, "client-1");
    }),
  );

  it.effect("fails with McpClientNotFoundError for an unknown or disabled MCP client", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);

      const error = yield* profileOf("client-1").pipe(
        Effect.flip,
        Effect.provide(directory(apiAnswering(urls, () => json(404, '{"error":"not_found"}')))),
      );

      assert.strictEqual(error._tag, "McpClientNotFoundError");
    }),
  );

  it.effect("passes a refused session through as UnauthorizedError and reports it", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);
      const expiries = yield* Ref.make(0);

      const error = yield* profileOf("client-1").pipe(
        Effect.flip,
        Effect.provide(
          directory(
            apiAnswering(urls, () => json(401, "{}")),
            countingExpiries(expiries),
          ),
        ),
      );

      assert.strictEqual(error._tag, "UnauthorizedError");
      assert.strictEqual(yield* Ref.get(expiries), 1);
    }),
  );

  it.effect("fails with McpClientDirectoryUnavailableError on a server error", () =>
    Effect.gen(function* () {
      const urls = yield* Ref.make<ReadonlyArray<string>>([]);

      const error = yield* profileOf("client-1").pipe(
        Effect.flip,
        Effect.provide(directory(apiAnswering(urls, () => json(500, "{}")))),
      );

      assert.strictEqual(error._tag, "McpClientDirectoryUnavailableError");
    }),
  );

  it.effect("fails with McpClientDirectoryUnavailableError when the api cannot be reached", () =>
    Effect.gen(function* () {
      const expiries = yield* Ref.make(0);

      const error = yield* profileOf("client-1").pipe(
        Effect.flip,
        Effect.provide(directory(apiUnreachable, countingExpiries(expiries))),
      );

      assert.strictEqual(error._tag, "McpClientDirectoryUnavailableError");
      assert.strictEqual(yield* Ref.get(expiries), 0);
    }),
  );
});
