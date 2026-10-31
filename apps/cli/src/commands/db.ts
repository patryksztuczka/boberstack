import { sqlFileMigrations } from "@boberstack/api/migrations";
import { NodeServices } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { Config, Console, Effect, Layer, Redacted } from "effect";
import { Command } from "effect/cli";
import { Migrator } from "effect/sql";

const LOCAL_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app";

const DatabaseLayer = PgClient.layerConfig({
  url: Config.Redacted("DATABASE_URL").pipe(Config.withDefault(Redacted.make(LOCAL_DATABASE_URL))),
});

const migrate = Command.make(
  "migrate",
  {},
  Effect.fn("cli.db.migrate")(
    function* () {
      const applied = yield* Migrator.make({})({ loader: sqlFileMigrations });

      if (applied.length === 0) {
        yield* Console.log("Database is up to date.");

        return;
      }

      for (const [id, name] of applied) {
        yield* Console.log(`Applied ${String(id).padStart(4, "0")}_${name}`);
      }
    },
    Effect.provide(Layer.mergeAll(DatabaseLayer, NodeServices.layer)),
  ),
).pipe(
  Command.withDescription("Apply apps/api/migrations to DATABASE_URL (local Postgres by default)"),
);

export const DbCommand = Command.make("db").pipe(
  Command.withDescription("Database tasks"),
  Command.withSubcommands([migrate]),
);
