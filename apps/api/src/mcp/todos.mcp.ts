import { TodosService } from "@boberstack/core/todos";
import { CurrentUser } from "@boberstack/domain/identity/current-user";
import { TodosToolkit } from "@boberstack/domain/todos/todos.mcp";
import { Effect, Option } from "effect";

const currentUser = Effect.serviceOption(CurrentUser).pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.die("McpAuthenticationLayer did not provide the Current User"),
      onSome: Effect.succeed,
    }),
  ),
);

export const TodosMcpLayer = TodosToolkit.toLayer(
  Effect.gen(function* () {
    const todos = yield* TodosService;

    return TodosToolkit.of({
      ListTodos: () =>
        currentUser.pipe(
          Effect.flatMap((user) => todos.list(user.id)),
          Effect.map((list) => ({ todos: list })),
        ),
      CreateTodo: (input) =>
        currentUser.pipe(Effect.flatMap((user) => todos.create(user.id, input))),
      UpdateTodo: ({ id, patch }) =>
        currentUser.pipe(Effect.flatMap((user) => todos.update(user.id, id, patch))),
      RemoveTodo: ({ id }) => currentUser.pipe(Effect.flatMap((user) => todos.remove(user.id, id))),
    });
  }),
);
