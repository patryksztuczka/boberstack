import { tester } from "../../../rule-tester.ts";
import { noDomainSqlRule } from "./no-domain-sql.ts";

const domain = "packages/core/src/todos/todo.service.ts";

const unitTest = "packages/core/src/todos/todo.service.test.ts";

const repository = "packages/database/src/todo.repository.ts";

const suite = "packages/core/src/todos/tests/todos.integration.test.ts";

const suiteException = { "packages/core/src/**/tests/*.integration.test.ts": "runs on Postgres" };

tester.run("@boberstack/effect/no-domain-sql", noDomainSqlRule, {
  valid: [
    { code: 'import { Context, Effect, Layer } from "effect";', filename: domain },
    { code: 'import { Schema } from "effect";', filename: domain },
    { code: 'import { HttpApi } from "effect/http-api";', filename: domain },
    { code: 'import { TodoId } from "@boberstack/domain";', filename: domain },
    { code: 'import { TodoStore } from "./todo.store.ts";', filename: domain },
    { code: 'import { schema } from "pg-format";', filename: domain },
    { code: 'import { x } from "effect/sqlite-like";', filename: domain },
    { code: 'const names = await import("./todo" + ".names.ts");', filename: domain },
    { code: 'const { Effect } = await import("effect");', filename: domain },
    {
      code: 'import { PgClient } from "@effect/sql-pg";\nimport { DatabaseConnection } from "../../../../database/src/database-connection.ts";',
      filename: suite,
      options: [{ exceptions: suiteException }],
    },
    {
      code: 'import { SqlClient } from "effect/sql";\nimport { PgClient } from "@effect/sql-pg";\nimport { DatabaseConnection } from "./database-connection.ts";',
      filename: repository,
    },
    {
      code: 'import { eq } from "drizzle-orm";',
      filename: domain,
      options: [{ paths: ["packages/other/src/**"] }],
    },
  ],
  invalid: [
    {
      code: 'import { SqlClient } from "effect/sql";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import * as SqlSchema from "effect/sql/SqlSchema";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { PgClient } from "@effect/sql-pg";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { Database } from "@alchemy.run/sql";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { eq, sql } from "drizzle-orm";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { DatabaseConnection } from "../../../database/src";',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { DatabaseConnection } from "../../../database/src/";',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import type { SqlError } from "effect/sql/SqlError";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { TodoRepositoryLayer } from "@boberstack/database";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { Pool } from "pg";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'export type { PgClient } from "@effect/sql-pg";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'export * from "drizzle-orm";',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'const { sql } = await import("drizzle-orm");',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: "const table = await import(`@effect/sql-pg/${name}`);",
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: "const helper = await import(`../../../database/src/${name}.ts`);",
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: "const helper = await import(`../../../data${name}.ts`);",
      filename: unitTest,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'const { PgTest } = require("../../../database/src/testing/pg" + suffix);',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: "const fixture = await import(`./fixtures/${name}.ts`);",
      filename: domain,
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: "const sibling = await import(name);",
      filename: domain,
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: "const helper = await import(`@effect/sq${name}`);",
      filename: domain,
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: 'const { eq } = require("drizzle-orm");',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import pg = require("pg");',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'type Client = import("@effect/sql-pg").PgClient;',
      filename: domain,
      errors: [{ messageId: "package" }],
    },
    {
      code: 'import { DatabaseConnection } from "../../../database/src/database-connection.ts";',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { seedTodos } from "../../../database/src/testing/seed-todos.ts";',
      filename: unitTest,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { PgTest } from "../../../database/src/testing/pg-test.ts";',
      filename: unitTest,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { PgClient } from "@effect/sql-pg";',
      filename: suite,
      errors: [{ messageId: "package" }],
    },
    {
      code: "export const store = 1;",
      filename: "packages/core/src/todos/todo.repository.ts",
      errors: [{ messageId: "repository" }],
    },
  ],
});
