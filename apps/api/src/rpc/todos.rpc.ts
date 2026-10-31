import { CurrentUser } from "@boberstack/domain/identity/current-user";
import { TodosRpcs } from "@boberstack/domain/todos/todos.rpc";
import { Effect } from "effect";

import { TodosService } from "../modules/todos/index.ts";

export const TodosRpcLayer = TodosRpcs.toLayer(
  Effect.gen(function* () {
    const todos = yield* TodosService;

    return TodosRpcs.of({
      ListTodos: () => CurrentUser.use((user) => todos.list(user.id)),
      CreateTodo: (input) => CurrentUser.use((user) => todos.create(user.id, input)),
      UpdateTodo: ({ id, patch }) => CurrentUser.use((user) => todos.update(user.id, id, patch)),
      RemoveTodo: ({ id }) => CurrentUser.use((user) => todos.remove(user.id, id)),
    });
  }),
);
