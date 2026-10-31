import { tester } from "../../../rule-tester.ts";
import { noDomainSqlRule } from "./no-domain-sql.ts";

const domain = "apps/api/src/modules/todos/todo.service.ts";

const unitTest = "apps/api/src/modules/todos/todo.service.test.ts";

const repository = "apps/api/src/platform/database/todo.repository.ts";

const suite = "apps/api/src/modules/todos/tests/todos.integration.test.ts";

const suiteException = { "apps/*/src/modules/**/tests/*.integration.test.ts": "runs on Postgres" };

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
      code: 'import { PgClient } from "@effect/sql-pg";\nimport { DatabaseConnection } from "../../../../platform/database/database-connection.ts";',
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
      options: [{ paths: ["apps/*/src/other/**"] }],
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
      code: 'import { DatabaseConnection } from "../../platform/database";',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { DatabaseConnection } from "../../platform/database/";',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import type { SqlError } from "effect/sql/SqlError";',
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
      code: "const helper = await import(`../../platform/database/${name}.ts`);",
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: "const helper = await import(`../../platform/data${name}.ts`);",
      filename: unitTest,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'const { PgTest } = require("../../testing/pg" + suffix);',
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
      code: 'import { DatabaseConnection } from "../../platform/database/database-connection.ts";',
      filename: domain,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { seedTodos } from "../../platform/database/testing/seed-todos.ts";',
      filename: unitTest,
      errors: [{ messageId: "database" }],
    },
    {
      code: 'import { PgTest } from "../../testing/pg-test.ts";',
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
      filename: "apps/api/src/modules/todos/todo.repository.ts",
      errors: [{ messageId: "repository" }],
    },
  ],
});
