import { tester } from "../../../rule-tester.ts";
import { serviceIdMatchesPathRule } from "./service-id-matches-path.ts";

const service = (name: string, id: string): string =>
  `import { Context } from "effect"; export class ${name} extends Context.Service<${name}, Api>()(${JSON.stringify(id)}) {}`;

const moduleFile = "apps/api/src/modules/todos/todo.service.ts";

const fileLayout = { sourceRoot: "apps/*/src", idSource: "file" };

tester.run("@boberstack/effect/service-id-matches-path", serviceIdMatchesPathRule, {
  valid: [
    { code: service("TodosService", "boberstack/todos/TodosService"), filename: moduleFile },
    {
      code: service("TodoStore", "boberstack/todos/TodoStore"),
      filename: "apps/api/src/modules/todos/todo.store.ts",
    },
    {
      code: service("TodoRepository", "boberstack/platform/database/TodoRepository"),
      filename: "apps/api/src/platform/database/todo.repository.ts",
    },
    {
      code: service("CurrentUser", "boberstack/domain/auth/CurrentUser"),
      filename: "packages/domain/src/auth/current-user.ts",
    },
    { code: service("Anything", "whatever"), filename: "scripts/tool.ts" },
    {
      code: service("TestPostgres", "boberstack/testing/TestPostgres"),
      filename: "apps/api/src/testing/pg-test.ts",
      options: [{ extraRoots: { "apps/*/src/testing": "boberstack/testing" } }],
    },
    {
      code: service("TodoMatcher", "boberstack/todos/matching/TodoMatcher"),
      filename: "apps/api/src/todos/matching/TodoMatcher.ts",
      options: [fileLayout],
    },
  ],
  invalid: [
    {
      code: service("TodosService", "TodosService"),
      filename: moduleFile,
      errors: [{ messageId: "id" }],
      output: service("TodosService", "boberstack/todos/TodosService"),
    },
    {
      code: service("TodoRepository", "boberstack/database/TodoRepository"),
      filename: "apps/api/src/platform/database/todo.repository.ts",
      errors: [{ messageId: "id" }],
      output: service("TodoRepository", "boberstack/platform/database/TodoRepository"),
    },
    {
      code: service("CurrentUser", "boberstack/auth/CurrentUser"),
      filename: "packages/domain/src/auth/current-user.ts",
      errors: [{ messageId: "id" }],
      output: service("CurrentUser", "boberstack/domain/auth/CurrentUser"),
    },
    {
      code: service("Matcher", "boberstack/todos/matching/TodoMatcher"),
      filename: "apps/api/src/todos/matching/TodoMatcher.ts",
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
