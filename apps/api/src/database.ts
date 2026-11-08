import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import { Config, Effect, Redacted } from "effect";

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

export const Database = Effect.gen(function* () {
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
