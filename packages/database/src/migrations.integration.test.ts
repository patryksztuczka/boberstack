import { assert, describe, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

import { PgTestLayer } from "./testing/pg-test.ts";

const TableRow = Schema.Struct({ tableName: Schema.String });

describe("migrations", () => {
  layer(PgTestLayer)((it) => {
    it.effect("name every table in the plural", () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const tables = yield* SqlSchema.findAll({
          Request: Schema.Void,
          Result: TableRow,
          execute: () => sql`
            select "table_name" as "tableName" from "information_schema"."tables"
            where "table_schema" = 'public' and "table_type" = 'BASE TABLE'
          `,
        })(undefined);

        const singular = tables
          .map(({ tableName }) => tableName)
          .filter((tableName) => !tableName.endsWith("s"));

        assert.deepStrictEqual(singular, []);
        assert.isAbove(tables.length, 0);
      }),
    );
  });
});
