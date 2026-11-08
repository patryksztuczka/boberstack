import type { UserId } from "@boberstack/domain/identity/user";
import type { NewTodo, Todo, TodoId, TodoPatch } from "@boberstack/domain/todos/todo";
import { TodoNotFoundError } from "@boberstack/domain/todos/todo.errors";
import { Context, DateTime, Effect, Layer, Option } from "effect";

import { TodoStore } from "./todo.store.ts";

export interface TodosServiceApi {
  readonly list: (ownerId: UserId) => Effect.Effect<ReadonlyArray<Todo>>;
  readonly create: (ownerId: UserId, input: NewTodo) => Effect.Effect<Todo>;
  readonly update: (
    ownerId: UserId,
    id: TodoId,
    patch: TodoPatch,
  ) => Effect.Effect<Todo, TodoNotFoundError>;
  readonly remove: (ownerId: UserId, id: TodoId) => Effect.Effect<void, TodoNotFoundError>;
}

export class TodosService extends Context.Service<TodosService, TodosServiceApi>()(
  "boberstack/todos/TodosService",
  {
    make: Effect.gen(function* () {
      const store = yield* TodoStore;

      const list = Effect.fn("TodosService.list")(function* (ownerId: UserId) {
        return yield* store.listByOwner(ownerId);
      });

      const create = Effect.fn("TodosService.create")(function* (ownerId: UserId, input: NewTodo) {
        const createdAt = yield* DateTime.now;

        return yield* store.insert({ ownerId, title: input.title, createdAt });
      });

      const update = Effect.fn("TodosService.update")(function* (
        ownerId: UserId,
        id: TodoId,
        patch: TodoPatch,
      ) {
        const updated = yield* store.update(ownerId, id, patch);

        if (Option.isNone(updated)) {
          return yield* new TodoNotFoundError({ id });
        }

        return updated.value;
      });

      const remove = Effect.fn("TodosService.remove")(function* (ownerId: UserId, id: TodoId) {
        const removed = yield* store.remove(ownerId, id);

        if (!removed) {
          return yield* new TodoNotFoundError({ id });
        }
      });

      return { list, create, update, remove };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make);
}
