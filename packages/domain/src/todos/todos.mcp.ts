import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";

import { TodoNotFoundError } from "./todo.errors.ts";
import { NewTodo, Todo, TodoId, TodoPatch } from "./todo.ts";

const ListTodos = Tool.make("ListTodos", {
  description:
    "List every Todo of the signed-in User, oldest first. Each Todo has an id, a title, whether it is done (completed) and when it was created. Call this first to find the id of a Todo to update or remove.",
  success: Schema.Struct({ todos: Schema.Array(Todo) }),
})
  .annotate(Tool.Title, "List todos")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

const CreateTodo = Tool.make("CreateTodo", {
  description:
    "Create a new Todo for the signed-in User. The title is trimmed and must be 1 to 200 characters. A new Todo is not done. Returns the created Todo with its id.",
  parameters: NewTodo,
  success: Todo,
})
  .annotate(Tool.Title, "Create a todo")
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

const UpdateTodo = Tool.make("UpdateTodo", {
  description:
    "Change the title of a Todo, mark it done or not done, or both. Pass the Todo id from ListTodos and only the fields to change: title (1 to 200 characters) and completed (true for done). Returns the updated Todo, or a TodoNotFoundError when the signed-in User has no Todo with that id.",
  parameters: Schema.Struct({ id: TodoId, patch: TodoPatch }),
  success: Todo,
  failure: TodoNotFoundError,
})
  .annotate(Tool.Title, "Update a todo")
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false);

const RemoveTodo = Tool.make("RemoveTodo", {
  description:
    "Delete a Todo for good; there is no undo. Pass the Todo id from ListTodos. Fails with a TodoNotFoundError when the signed-in User has no Todo with that id.",
  parameters: Schema.Struct({ id: TodoId }),
  failure: TodoNotFoundError,
})
  .annotate(Tool.Title, "Remove a todo")
  .annotate(Tool.OpenWorld, false);

export const TodosToolkit = Toolkit.make(ListTodos, CreateTodo, UpdateTodo, RemoveTodo);
