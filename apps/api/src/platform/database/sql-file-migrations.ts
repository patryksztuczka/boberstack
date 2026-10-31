import { Effect, FileSystem, Path } from "effect";
import { Migrator, SqlClient } from "effect/sql";

import { splitSqlStatements } from "./sql-statements.ts";

const MIGRATION_FILE = /^(\d+)_([^.]+)\.sql$/;

const MIGRATIONS_DIRECTORY = new URL("../../../migrations", import.meta.url);

export const sqlFileMigrations: Migrator.Loader<FileSystem.FileSystem | Path.Path> = Effect.gen(
  function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* path.fromFileUrl(MIGRATIONS_DIRECTORY);
    const files = yield* fs.readDirectory(directory);

    return files
      .flatMap((file) => {
        const match = MIGRATION_FILE.exec(file);

        return match?.[1] === undefined || match[2] === undefined
          ? []
          : [{ id: Number(match[1]), name: match[2], file: path.join(directory, file) }];
      })
      .toSorted((left, right) => left.id - right.id)
      .map(({ id, name, file }): Migrator.ResolvedMigration => [
        id,
        name,
        Effect.succeed(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const text = yield* fs.readFileString(file);

            yield* Effect.forEach(splitSqlStatements(text), (statement) => sql.unsafe(statement), {
              discard: true,
            });
          }),
        ),
      ]);
  },
).pipe(
  Effect.mapError(
    (cause) =>
      new Migrator.MigrationError({
        kind: "BadState",
        message: `Cannot read the SQL migrations in apps/api/migrations: ${cause.message}`,
        cause,
      }),
  ),
);
