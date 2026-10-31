import { NodeServices } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Effect, Layer, Redacted } from "effect";
import { Migrator } from "effect/sql";

import { sqlFileMigrations } from "../platform/database/sql-file-migrations.ts";

const POSTGRES_IMAGE = "postgres:17-alpine";

const startPostgres = Effect.acquireRelease(
  Effect.promise(() => new PostgreSqlContainer(POSTGRES_IMAGE).start()),
  (container) => Effect.promise(() => container.stop()),
);

const PgClientOnContainerLayer = Layer.unwrap(
  Effect.map(startPostgres, (container) =>
    PgClient.layer({ url: Redacted.make(container.getConnectionUri()) }),
  ),
);

const MigrationsLayer = Layer.effectDiscard(Migrator.make({})({ loader: sqlFileMigrations })).pipe(
  Layer.provide(NodeServices.layer),
);

export const PgTestLayer = MigrationsLayer.pipe(Layer.provideMerge(PgClientOnContainerLayer));
