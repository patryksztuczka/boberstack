import { UserId } from "@boberstack/domain/identity/user";
import { Todo, TodoId, TodoTitle } from "@boberstack/domain/todos/todo";
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";
import { TestClock } from "effect/testing";

import { TodosService } from "./todo.service.ts";
import { TodoStore } from "./todo.store.ts";
import type { TodoStoreApi } from "./todo.store.ts";

const alice = UserId.make("user-alice");

const todoId = TodoId.make("3f0c5c1e-8a4b-4c3e-9a51-6f1f2d1b7c10");

const storedTodo = new Todo({
  id: todoId,
  title: TodoTitle.make("Write the starter"),
  completed: false,
  createdAt: DateTime.makeUnsafe(0),
});

const withStore = (store: Partial<TodoStoreApi>) =>
  TodosService.layer.pipe(Layer.provide(Layer.mock(TodoStore)(store)));

describe("TodosService", () => {
  it.effect("stamps a new todo with the current time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(Date.parse("2026-10-30T09:00:00.000Z"));
      const todos = yield* TodosService;

      const created = yield* todos.create(alice, { title: TodoTitle.make("Write the starter") });

      assert.strictEqual(DateTime.formatIso(created.createdAt), "2026-10-30T09:00:00.000Z");
    }).pipe(
      Effect.provide(
        withStore({
          insert: (record) =>
            Effect.succeed(
              new Todo({
                id: storedTodo.id,
                title: record.title,
                completed: false,
                createdAt: record.createdAt,
              }),
            ),
        }),
      ),
    ),
  );

  it.effect("fails with TodoNotFoundError when the store finds nothing to update", () =>
    Effect.gen(function* () {
      const todos = yield* TodosService;

      const error = yield* Effect.flip(todos.update(alice, todoId, { completed: true }));

      assert.strictEqual(error._tag, "TodoNotFoundError");
      assert.strictEqual(error.id, todoId);
    }).pipe(Effect.provide(withStore({ update: () => Effect.succeedNone }))),
  );

  it.effect("fails with TodoNotFoundError when the store removes nothing", () =>
    Effect.gen(function* () {
      const todos = yield* TodosService;

      const error = yield* Effect.flip(todos.remove(alice, todoId));

      assert.strictEqual(error.id, todoId);
    }).pipe(Effect.provide(withStore({ remove: () => Effect.succeed(false) }))),
  );
});
