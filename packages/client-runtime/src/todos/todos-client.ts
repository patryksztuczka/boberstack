import { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import type { NewTodo, Todo, TodoId, TodoPatch } from "@boberstack/domain/todos/todo";
import type { TodoNotFoundError } from "@boberstack/domain/todos/todo.errors";
import { Context, Effect, Schema } from "effect";

import { SessionExpiry } from "../session/index.ts";
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
  "boberstack/client-runtime/todos/TodosClient",
) {}

const isUnauthorized = Schema.is(UnauthorizedError);

export const reportingSessionExpiry = (client: TodosClientApi) =>
  Effect.map(SessionExpiry, ({ expire }) => {
    const report = <A, E>(effect: Effect.Effect<A, E>) =>
      Effect.tapError(effect, (error) => (isUnauthorized(error) ? expire : Effect.void));

    return TodosClient.of({
      list: report(client.list),
      create: (input) => report(client.create(input)),
      update: (id, patch) => report(client.update(id, patch)),
      remove: (id) => report(client.remove(id)),
    });
  });
