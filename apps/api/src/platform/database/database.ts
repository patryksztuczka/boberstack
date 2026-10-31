import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Neon from "@alchemy.run/neon";
import * as Alchemy from "alchemy";
import { Config, Effect, Redacted } from "effect";

const LOCAL_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app";

const NEON_REGION = "aws-eu-central-1";

const localOrigin = Effect.gen(function* () {
  const url = new URL(
    Redacted.value(
      yield* Config.Redacted("DATABASE_URL").pipe(
        Config.withDefault(Redacted.make(LOCAL_DATABASE_URL)),
      ),
    ),
  );

  return {
    scheme: "postgres" as const,
    host: url.hostname,
    port: Number(url.port || "5432"),
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: Redacted.make(decodeURIComponent(url.password)),
  };
});

export const Database = Effect.gen(function* () {
  if (yield* Alchemy.ALCHEMY_DEV) {
    const origin = yield* localOrigin;

    return yield* Cloudflare.Hyperdrive.Connection("Database", {
      origin,
      caching: { disabled: true },
      dev: { ...origin, sslmode: "disable" },
    });
  }

  const project = yield* Neon.Project("DatabaseProject", { region: NEON_REGION });

  const branch = yield* Neon.Branch("DatabaseBranch", {
    project,
    migrations: "../api/migrations",
  });

  return yield* Cloudflare.Hyperdrive.Connection("Database", {
    origin: branch.origin,
    caching: { disabled: true },
  });
});
