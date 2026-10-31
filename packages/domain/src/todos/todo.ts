import { Schema } from "effect";

export const TODO_TITLE_MAX_LENGTH = 200;

export const TodoId = Schema.String.check(Schema.isUUID()).pipe(Schema.brand("TodoId"));

export type TodoId = typeof TodoId.Type;

export const TodoTitle = Schema.Trimmed.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(TODO_TITLE_MAX_LENGTH),
).pipe(Schema.brand("TodoTitle"));

export type TodoTitle = typeof TodoTitle.Type;

export class Todo extends Schema.Class<Todo, { readonly brand: unique symbol }>("Todo")({
  id: TodoId,
  title: TodoTitle,
  completed: Schema.Boolean,
  createdAt: Schema.DateTimeUtcFromString,
}) {}

export const NewTodo = Schema.Struct({
  title: TodoTitle,
});

export type NewTodo = typeof NewTodo.Type;

export const TodoPatch = Schema.Struct({
  title: Schema.optional(TodoTitle),
  completed: Schema.optional(Schema.Boolean),
});

export type TodoPatch = typeof TodoPatch.Type;
