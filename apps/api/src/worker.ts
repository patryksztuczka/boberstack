import { CloudflareHyperdrive } from "@alchemy.run/better-auth/CloudflareHyperdrive";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as SQL from "@alchemy.run/sql/Postgres";
import * as Http from "alchemy/Http";
import { Config, Effect, Layer } from "effect";
import { HttpRouter, HttpServerRequest } from "effect/http";

import { AppLayer } from "./app.layer.ts";
import { Auth } from "./platform/authentication/better-auth.ts";
import { SocialSignIn } from "./platform/authentication/social-sign-in.ts";
import { Database } from "./platform/database/database.ts";
import { MailpitMailer } from "./platform/mail/index.ts";

const isAuthPath = (pathname: string) =>
  pathname === "/api/auth" || pathname.startsWith("/api/auth/");

const MailerLayer = Layer.unwrap(
  Effect.map(
    Config.Literals(["mailpit"], "MAIL_TRANSPORT"),
    (transport) => ({ mailpit: MailpitMailer.layerConfig })[transport],
  ),
);

const AuthLayer = Layer.unwrap(
  Effect.map(Database, (connection) =>
    Auth.layer.pipe(
      Layer.provide(CloudflareHyperdrive(connection)),
      Layer.provide(MailerLayer),
      Layer.provide(SocialSignIn.layerConfig),
    ),
  ),
);

export default class Api extends Cloudflare.Worker<Api>()(
  "Api",
  Effect.map(Config.Port("DEV_API_PORT").pipe(Config.withDefault(1337)), (port) => ({
    main: import.meta.url,
    compatibility: { flags: ["nodejs_compat"] },
    assets: {
      directory: "../web/dist",
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    dev: { port, strictPort: true },
  })),
  Effect.gen(function* () {
    const auth = yield* Auth;
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database);

    const app = yield* HttpRouter.toHttpEffect(
      AppLayer.pipe(
        Layer.provide(SQL.PostgresLayer({ url: hyperdrive.connectionString })),
        Layer.provide(SocialSignIn.layerConfig),
        Layer.provide(Http.Platform),
      ),
    );

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const { pathname } = new URL(request.url, "http://localhost");

        return isAuthPath(pathname) ? yield* auth.handle : yield* app;
      }),
    };
  }).pipe(Effect.provide(AuthLayer.pipe(Layer.provideMerge(Cloudflare.Hyperdrive.ConnectBinding)))),
) {}
