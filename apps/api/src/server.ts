// @effect-diagnostics nodeBuiltinImport:off -- NodeHttpServer listens on a server that node:http creates
import { createServer } from "node:http";

import { Postgres as AuthPostgres } from "@alchemy.run/better-auth/Postgres";
import { Auth } from "@boberstack/auth";
import { layerSubprocess } from "@boberstack/capability/code-mode";
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { Config, Effect, Layer, Option } from "effect";
import { HttpServer, HttpServerRequest, HttpStaticServer } from "effect/http";

import { ApiHandler, AuthLayer, isApiPath } from "./app.layer.ts";

const DatabaseUrl = Config.Redacted("DATABASE_URL");

const ServerLayer = Layer.unwrap(
  Effect.map(Config.Port("PORT").pipe(Config.withDefault(3000)), (port) =>
    NodeHttpServer.layer(createServer, { port }),
  ),
);

const ServerAuthLayer = Layer.unwrap(
  Effect.map(DatabaseUrl, (url) => AuthLayer(Auth.layerConfig, AuthPostgres(url))),
);

const SandboxLayer = layerSubprocess().pipe(Layer.provide(NodeServices.layer));

const WebApp = Effect.gen(function* () {
  const root = yield* Config.String("WEB_ROOT").pipe(Config.option);

  return yield* Option.match(root, {
    onNone: () => Effect.succeedNone,
    onSome: (directory) => Effect.asSome(HttpStaticServer.make({ root: directory, spa: true })),
  });
});

const Handler = Effect.gen(function* () {
  const api = yield* ApiHandler(PgClient.layerConfig({ url: DatabaseUrl }));
  const web = yield* WebApp;

  return {
    fetch: Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const { pathname } = new URL(request.url, "http://localhost");

      return Option.isNone(web) || isApiPath(pathname) ? yield* api.fetch : yield* web.value;
    }),
  };
});

Layer.unwrap(Effect.map(Handler, ({ fetch }) => HttpServer.serve(fetch))).pipe(
  Layer.provide(ServerAuthLayer),
  Layer.provide(SandboxLayer),
  Layer.provide(ServerLayer),
  Layer.launch,
  NodeRuntime.runMain,
);
