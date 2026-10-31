import { Api } from "@boberstack/domain/api";
import { CurrentUser } from "@boberstack/domain/identity/current-user";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { TodosService } from "../modules/todos/index.ts";

export const TodosHttpLayer = HttpApiBuilder.group(Api, "todos", (handlers) =>
  Effect.gen(function* () {
    const todos = yield* TodosService;

    return handlers
      .handle("list", () => CurrentUser.use((user) => todos.list(user.id)))
      .handle("create", ({ payload }) => CurrentUser.use((user) => todos.create(user.id, payload)))
      .handle("update", ({ params, payload }) =>
        CurrentUser.use((user) => todos.update(user.id, params.id, payload)),
      )
      .handle("remove", ({ params }) =>
        CurrentUser.use((user) => todos.remove(user.id, params.id)),
      );
  }),
);
