import { CloudflareHyperdrive } from "@alchemy.run/better-auth/CloudflareHyperdrive";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as SQL from "@alchemy.run/sql/Postgres";
import { ApiHandler, AuthLayer } from "@boberstack/api/app";
import { Auth } from "@boberstack/auth";
import { layerWorkerLoader } from "@boberstack/capability/code-mode";
import type { WorkerLoaderBinding } from "@boberstack/capability/code-mode";
import * as Alchemy from "alchemy";
import * as Http from "alchemy/Http";
import { Config, Effect, Layer, Redacted } from "effect";

const CODE_SANDBOX = "CODE_SANDBOX";

const LOCAL_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app";

const DatabaseUrl = Config.Redacted("DATABASE_URL");

const originOf = (databaseUrl: Redacted.Redacted<string>) => {
  const url = new URL(Redacted.value(databaseUrl));

  return {
    scheme: "postgres" as const,
    host: url.hostname,
    port: Number(url.port || "5432"),
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: Redacted.make(decodeURIComponent(url.password)),
  };
};

const Database = Effect.gen(function* () {
  if (yield* Alchemy.ALCHEMY_DEV) {
    const origin = originOf(
      yield* DatabaseUrl.pipe(Config.withDefault(Redacted.make(LOCAL_DATABASE_URL))),
    );

    return yield* Cloudflare.Hyperdrive.Connection("Database", {
      origin,
      caching: { disabled: true },
      dev: { ...origin, sslmode: "disable" },
    });
  }

  return yield* Cloudflare.Hyperdrive.Connection("Database", {
    origin: originOf(yield* DatabaseUrl),
    caching: { disabled: true },
  });
});

const WorkerAuthLayer = Layer.unwrap(
  Effect.map(Database, (connection) => AuthLayer(Auth.layer, CloudflareHyperdrive(connection))),
);

export default class Api extends Cloudflare.Worker<Api>()(
  "Api",
  Effect.map(Config.Port("DEV_API_PORT").pipe(Config.withDefault(1337)), (port) => ({
    main: import.meta.url,
    compatibility: { flags: ["nodejs_compat"] },
    assets: {
      directory: "../web/dist",
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*", "/.well-known/*"],
    },
    dev: { port, strictPort: true },
  })),
  Effect.gen(function* () {
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database);

    yield* Cloudflare.WorkerLoader(CODE_SANDBOX);

    const environment = yield* Cloudflare.WorkerEnvironment;

    // SAFETY: `Cloudflare.WorkerLoader(CODE_SANDBOX)` above declares this binding; Alchemy types the Worker environment as a dictionary it fills in at runtime.
    const { [CODE_SANDBOX]: loader } = environment as Readonly<
      Record<typeof CODE_SANDBOX, WorkerLoaderBinding>
    >;

    return yield* ApiHandler(SQL.PostgresLayer({ url: hyperdrive.connectionString })).pipe(
      Effect.provide(Layer.mergeAll(layerWorkerLoader(loader), Http.Platform)),
    );
  }).pipe(
    Effect.provide(WorkerAuthLayer.pipe(Layer.provideMerge(Cloudflare.Hyperdrive.ConnectBinding))),
  ),
) {}
