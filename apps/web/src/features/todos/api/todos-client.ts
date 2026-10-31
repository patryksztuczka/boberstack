import type { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import type { NewTodo, Todo, TodoId, TodoPatch } from "@boberstack/domain/todos/todo";
import type { TodoNotFoundError } from "@boberstack/domain/todos/todo.errors";
import { Context } from "effect";
import type { Effect } from "effect";

import type { TodosUnavailableError } from "./todos-client.errors.ts";

export type TodosClientError = UnauthorizedError | TodosUnavailableError;

export interface TodosClientApi {
  readonly list: Effect.Effect<ReadonlyArray<Todo>, TodosClientError>;
  readonly create: (input: NewTodo) => Effect.Effect<Todo, TodosClientError>;
  readonly update: (
    id: TodoId,
    patch: TodoPatch,
  ) => Effect.Effect<Todo, TodoNotFoundError | TodosClientError>;
  readonly remove: (id: TodoId) => Effect.Effect<void, TodoNotFoundError | TodosClientError>;
}

export class TodosClient extends Context.Service<TodosClient, TodosClientApi>()(
  "boberstack/web/todos/TodosClient",
) {}
