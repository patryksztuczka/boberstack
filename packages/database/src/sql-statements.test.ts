import { assert, describe, it } from "@effect/vitest";

import { splitSqlStatements } from "./sql-statements.ts";

describe("splitSqlStatements", () => {
  it("splits statements on semicolons", () => {
    assert.deepStrictEqual(
      splitSqlStatements("create table a (id int);\n\ncreate index b on a (id);\n"),
      ["create table a (id int)", "create index b on a (id)"],
    );
  });

  it("keeps semicolons inside quotes, comments and dollar-quoted bodies", () => {
    const sql = [
      "insert into t values ('a;b', \"c;d\");",
      "-- a comment; still a comment",
      "create function f() returns int as $body$ select 1; $body$ language sql;",
      "/* block; comment */ select 2;",
    ].join("\n");

    assert.deepStrictEqual(splitSqlStatements(sql), [
      "insert into t values ('a;b', \"c;d\")",
      "-- a comment; still a comment\ncreate function f() returns int as $body$ select 1; $body$ language sql",
      "/* block; comment */ select 2",
    ]);
  });

  it("drops empty statements and comment-only leftovers", () => {
    assert.deepStrictEqual(splitSqlStatements("-- header only\n;;\n select 1;\n-- trailing\n"), [
      "select 1",
    ]);
  });
});
