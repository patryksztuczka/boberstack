import { tester } from "../../../rule-tester.ts";
import { serviceIdMatchesPathRule } from "./service-id-matches-path.ts";

const service = (name: string, id: string): string =>
  `import { Context } from "effect"; export class ${name} extends Context.Service<${name}, Api>()(${JSON.stringify(id)}) {}`;

const moduleFile = "packages/core/src/todos/todo.service.ts";

const fileLayout = { prefix: "boberstack", sourceRoot: "packages/*/src", idSource: "file" };

tester.run("@boberstack/effect/service-id-matches-path", serviceIdMatchesPathRule, {
  valid: [
    { code: service("TodosService", "boberstack/core/todos/TodosService"), filename: moduleFile },
    {
      code: service("TodoStore", "boberstack/core/todos/TodoStore"),
      filename: "packages/core/src/todos/todo.store.ts",
    },
    {
      code: service("TodoRepository", "boberstack/database/TodoRepository"),
      filename: "packages/database/src/todo.repository.ts",
    },
    {
      code: service("Auth", "boberstack/auth/Auth"),
      filename: "packages/auth/src/better-auth.ts",
    },
    {
      code: service("CurrentUser", "boberstack/domain/auth/CurrentUser"),
      filename: "packages/domain/src/auth/current-user.ts",
    },
    {
      code: service("S3Storage", "boberstack/storage/S3Storage"),
      filename: "packages/storage/src/s3-storage.ts",
    },
    { code: service("Anything", "whatever"), filename: "scripts/tool.ts" },
    {
      code: service("TestPostgres", "boberstack/testing/TestPostgres"),
      filename: "packages/database/src/testing/pg-test.ts",
      options: [{ extraRoots: { "packages/database/src/testing": "boberstack/testing" } }],
    },
    {
      code: service("TodoMatcher", "boberstack/todos/matching/TodoMatcher"),
      filename: "packages/app/src/todos/matching/TodoMatcher.ts",
      options: [fileLayout],
    },
  ],
  invalid: [
    {
      code: service("TodosService", "TodosService"),
      filename: moduleFile,
      errors: [{ messageId: "id" }],
      output: service("TodosService", "boberstack/core/todos/TodosService"),
    },
    {
      code: service("TodoRepository", "boberstack/core/database/TodoRepository"),
      filename: "packages/database/src/todo.repository.ts",
      errors: [{ messageId: "id" }],
      output: service("TodoRepository", "boberstack/database/TodoRepository"),
    },
    {
      code: service("S3Storage", "boberstack/s3/S3Storage"),
      filename: "packages/storage/src/s3-storage.ts",
      errors: [{ messageId: "id" }],
      output: service("S3Storage", "boberstack/storage/S3Storage"),
    },
    {
      code: service("CurrentUser", "boberstack/auth/CurrentUser"),
      filename: "packages/domain/src/auth/current-user.ts",
      errors: [{ messageId: "id" }],
      output: service("CurrentUser", "boberstack/domain/auth/CurrentUser"),
    },
    {
      code: service("Matcher", "boberstack/todos/matching/TodoMatcher"),
      filename: "packages/app/src/todos/matching/TodoMatcher.ts",
      options: [fileLayout],
      errors: [{ messageId: "className" }],
    },
    {
      code: service("TodosService", "boberstack/todos/TodosService"),
      filename: moduleFile,
      options: [{ prefix: "acme" }],
      errors: [{ messageId: "id" }],
      output: service("TodosService", "acme/todos/TodosService"),
    },
  ],
});
