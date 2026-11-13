import { implement } from "@boberstack/capability";
import { TodosService } from "@boberstack/core/todos";
import { CurrentUser } from "@boberstack/domain/identity/current-user";
import {
  CreateTodo,
  ListTodos,
  RemoveTodo,
  UpdateTodo,
} from "@boberstack/domain/todos/todos.contracts";
import { Effect } from "effect";

export const TodosCapabilities = [
  implement(ListTodos, () =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const todos = yield* TodosService;

      return { todos: yield* todos.list(user.id) };
    }),
  ),
  implement(CreateTodo, (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const todos = yield* TodosService;

      return yield* todos.create(user.id, input);
    }),
  ),
  implement(UpdateTodo, ({ id, ...patch }) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const todos = yield* TodosService;

      return yield* todos.update(user.id, id, patch);
    }),
  ),
  implement(RemoveTodo, ({ id }) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const todos = yield* TodosService;

      return yield* todos.remove(user.id, id);
    }),
  ),
] as const;
