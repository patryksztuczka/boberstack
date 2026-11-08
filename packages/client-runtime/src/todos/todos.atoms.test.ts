import { Todo, TodoId, TodoTitle } from "@boberstack/domain/todos/todo";
import { TodoNotFoundError } from "@boberstack/domain/todos/todo.errors";
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Ref } from "effect";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";

import { clientLayer } from "../atom-runtime/index.ts";
import { SignInMethodsClient } from "../identity/index.ts";
import { TodosClient } from "./todos-client.ts";
import { createTodo, removeTodo, todos } from "./todos.atoms.ts";

const ids = [
  TodoId.make("3f0c5c1e-8a4b-4c3e-9a51-6f1f2d1b7c10"),
  TodoId.make("9b2d4e61-1c7f-4a3b-8e5d-2f6a7c8b9d01"),
];

const todosInMemory = (stored: Ref.Ref<ReadonlyArray<Todo>>) =>
  Layer.mergeAll(
    Layer.succeed(
      TodosClient,
      TodosClient.of({
        list: Ref.get(stored),
        create: (input) =>
          Ref.modify(stored, (current) => {
            const todo = new Todo({
              id: ids[current.length] ?? ids[0]!,
              title: input.title,
              completed: false,
              createdAt: DateTime.makeUnsafe("2026-10-30T09:00:00.000Z"),
            });

            return [todo, [...current, todo]];
          }),
        update: (id) => Effect.fail(new TodoNotFoundError({ id })),
        remove: (id) =>
          Ref.modify(stored, (current) => [
            current.some((todo) => todo.id === id),
            current.filter((todo) => todo.id !== id),
          ]).pipe(
            Effect.flatMap((removed) =>
              removed ? Effect.void : Effect.fail(new TodoNotFoundError({ id })),
            ),
          ),
      }),
    ),
    Layer.mock(SignInMethodsClient, {}),
  );

const registryWith = (layer: Layer.Layer<TodosClient | SignInMethodsClient>) =>
  Effect.acquireRelease(
    Effect.sync(() =>
      AtomRegistry.make({ initialValues: [Atom.initialValue(clientLayer, layer)] }),
    ),
    (registry) => Effect.sync(() => registry.dispose()),
  );

const titles = (result: AsyncResult.AsyncResult<ReadonlyArray<Todo>, unknown>) =>
  AsyncResult.getOrElse(result, () => []).map((todo) => todo.title);

describe("todos atoms", () => {
  it.effect("list the todos from the client the registry was given", () =>
    Effect.gen(function* () {
      const stored = yield* Ref.make<ReadonlyArray<Todo>>([]);
      const registry = yield* registryWith(todosInMemory(stored));

      registry.mount(todos);

      assert.deepStrictEqual(titles(registry.get(todos)), []);
    }),
  );

  it.effect("re-fetch the list after a todo is created", () =>
    Effect.gen(function* () {
      const stored = yield* Ref.make<ReadonlyArray<Todo>>([]);
      const registry = yield* registryWith(todosInMemory(stored));

      registry.mount(todos);
      registry.mount(createTodo);
      registry.set(createTodo, { title: TodoTitle.make("Write the starter") });

      yield* AtomRegistry.getResult(registry, createTodo);

      assert.deepStrictEqual(titles(registry.get(todos)), ["Write the starter"]);
    }),
  );

  it.effect("re-fetch the list after a todo is removed", () =>
    Effect.gen(function* () {
      const stored = yield* Ref.make<ReadonlyArray<Todo>>([]);
      const registry = yield* registryWith(todosInMemory(stored));

      registry.mount(todos);
      registry.mount(createTodo);
      registry.set(createTodo, { title: TodoTitle.make("Write the starter") });

      const created = yield* AtomRegistry.getResult(registry, createTodo);
      const remove = removeTodo(created.id);

      registry.mount(remove);
      registry.set(remove, undefined);

      yield* AtomRegistry.getResult(registry, remove);

      assert.deepStrictEqual(titles(registry.get(todos)), []);
    }),
  );

  it.effect("keep the typed failure of a mutation", () =>
    Effect.gen(function* () {
      const stored = yield* Ref.make<ReadonlyArray<Todo>>([]);
      const registry = yield* registryWith(todosInMemory(stored));
      const remove = removeTodo(ids[1]!);

      registry.mount(remove);
      registry.set(remove, undefined);

      const error = yield* AtomRegistry.getResult(registry, remove).pipe(Effect.flip);

      assert.strictEqual(error._tag, "TodoNotFoundError");
    }),
  );
});
