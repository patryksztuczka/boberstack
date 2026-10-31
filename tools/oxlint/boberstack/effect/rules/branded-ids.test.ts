import { tester } from "../../../rule-tester.ts";
import { brandedIdsRule } from "./branded-ids.ts";

const error = { messageId: "unbranded" };

tester.run("@boberstack/effect/branded-ids", brandedIdsRule, {
  valid: [
    'import { Schema } from "effect"; class Todo extends Schema.Class<Todo>("Todo")({ todoId: TodoId, confidence: Schema.Number }) {}',
    'import { Schema } from "effect"; const Row = Schema.Struct({ name: Schema.String, listId: ReferenceChannelId });',
    'import { Schema } from "effect"; const TodoId = Schema.String.pipe(Schema.brand("TodoId"));',
    "const config = { todoId: Schema.String };",
    'import { Schema } from "effect"; const Row = Schema.Struct({ valid: Schema.Boolean, paid: Schema.String });',
  ],
  invalid: [
    {
      code: 'import { Schema } from "effect"; class Todo extends Schema.Class<Todo>("Todo")({ todoId: Schema.String }) {}',
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const Row = Schema.Struct({ id: Schema.UUID, listId: Schema.Number });',
      errors: [error, error],
    },
    {
      code: 'import { Schema } from "effect"; class TodoNotFoundError extends Schema.TaggedError<TodoNotFoundError>()("TodoNotFoundError", { todoId: Schema.String }) {}',
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const Row = Schema.Struct({ segmentId: Schema.optional(Schema.String) });',
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const Row = Schema.Struct({ ref: Schema.String });',
      options: [{ keyPattern: "^ref$" }],
      errors: [error],
    },
  ],
});
