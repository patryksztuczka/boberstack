import { tester } from "../../../rule-tester.ts";
import { taggedErrorNamingRule } from "./tagged-error-naming.ts";

const schemaError = (name: string, tag: string): string =>
  `import { Schema } from "effect"; export class ${name} extends Schema.TaggedError<${name}>()("${tag}", { id: Schema.String }) {}`;

const errorsFile = "packages/domain/src/todos/todo.errors.ts";

tester.run("@boberstack/effect/tagged-error-naming", taggedErrorNamingRule, {
  valid: [
    { code: schemaError("TodoNotFoundError", "TodoNotFoundError"), filename: errorsFile },
    {
      code: 'import { Data } from "effect"; class TitleTooLongError extends Data.TaggedError("TitleTooLongError")<{ n: number }> {}',
      filename: errorsFile,
    },
    { code: "class Plain extends Base {}", filename: "apps/api/src/modules/todos/todo.service.ts" },
    {
      code: schemaError("TodoNotFoundError", "TodoNotFoundError"),
      filename: "todos/TodoErrors.ts",
      options: [{ filePattern: "Errors\\.ts$" }],
    },
    {
      code: schemaError("TodoNotFoundError", "TodoNotFoundError"),
      filename: "todos/anywhere.ts",
      options: [{ filePattern: "" }],
    },
  ],
  invalid: [
    {
      code: schemaError("TodoNotFound", "TodoNotFound"),
      filename: errorsFile,
      errors: [{ messageId: "suffix" }],
    },
    {
      code: schemaError("TodoNotFoundError", "NotFound"),
      filename: errorsFile,
      errors: [{ messageId: "tag" }],
    },
    {
      code: schemaError("TodoNotFoundError", "TodoNotFoundError"),
      filename: "apps/api/src/modules/todos/todo.service.ts",
      errors: [{ messageId: "location" }],
    },
    {
      code: schemaError("TodoNotFoundError", "TodoNotFoundError"),
      filename: "packages/domain/src/todos/TodoErrors.ts",
      errors: [{ messageId: "location" }],
    },
    {
      code: 'import { Data as D } from "effect"; class Oops extends D.TaggedError("Boom")<{}> {}',
      filename: errorsFile,
      errors: [{ messageId: "suffix" }, { messageId: "tag" }],
    },
  ],
});
