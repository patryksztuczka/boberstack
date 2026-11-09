import type { Database as AuthDatabase } from "@alchemy.run/better-auth/Database";
import { Auth, SocialSignIn } from "@boberstack/auth";
import { TodosService } from "@boberstack/core/todos";
import { TodoRepositoryLayer } from "@boberstack/database";
import { MailpitMailer } from "@boberstack/mail";
import { Config, Effect, Layer } from "effect";
import { HttpRouter, HttpServerRequest } from "effect/http";
import type { SqlClient } from "effect/sql";

import { HttpLayer } from "./http/http.layer.ts";
import { McpLayer } from "./mcp/mcp.layer.ts";
import { RpcLayer } from "./rpc/rpc.layer.ts";

export const AppLayer = Layer.mergeAll(HttpLayer, RpcLayer, McpLayer).pipe(
  Layer.provide(TodosService.layer),
  Layer.provide(TodoRepositoryLayer),
);

export const isApiPath = (pathname: string) =>
  pathname === "/api" || pathname.startsWith("/api/") || pathname.startsWith("/.well-known/");

const isAuthPath = (pathname: string) =>
  pathname === "/api/auth" ||
  pathname.startsWith("/api/auth/") ||
  pathname.startsWith("/.well-known/oauth-") ||
  pathname.startsWith("/.well-known/openid-configuration");

const MailerLayer = Layer.unwrap(
  Effect.map(
    Config.Literals(["mailpit"], "MAIL_TRANSPORT"),
    (transport) => ({ mailpit: MailpitMailer.layerConfig })[transport],
  ),
);

export const AuthLayer = <E, R, DE, DR>(
  auth: Layer.Layer<Auth, E, R>,
  database: Layer.Layer<AuthDatabase, DE, DR>,
) =>
  auth.pipe(
    Layer.provide(database),
    Layer.provide(MailerLayer),
    Layer.provide(SocialSignIn.layerConfig),
  );

export const ApiHandler = <E, R>(sql: Layer.Layer<SqlClient.SqlClient, E, R>) =>
  Effect.gen(function* () {
    const auth = yield* Auth;

    const app = yield* HttpRouter.toHttpEffect(
      AppLayer.pipe(Layer.provide(sql), Layer.provide(SocialSignIn.layerConfig)),
    );

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const { pathname } = new URL(request.url, "http://localhost");

        return isAuthPath(pathname) ? yield* auth.handle : yield* app;
      }),
    };
  });
