import type { NewTodo, TodoId, TodoPatch } from "@boberstack/domain/todos/todo";
import { Atom } from "effect/reactivity";

import { clientRuntime } from "../atom-runtime/index.ts";
import { TodosClient } from "./todos-client.ts";

const todosKeys = ["todos"];

export const todos = clientRuntime
  .atom(TodosClient.use((client) => client.list))
  .pipe(Atom.withReactivity(todosKeys));

export const createTodo = clientRuntime.fn(
  (input: NewTodo) => TodosClient.use((client) => client.create(input)),
  { reactivityKeys: todosKeys },
);

export const updateTodo = Atom.family((id: TodoId) =>
  clientRuntime.fn((patch: TodoPatch) => TodosClient.use((client) => client.update(id, patch)), {
    reactivityKeys: todosKeys,
  }),
);

export const removeTodo = Atom.family((id: TodoId) =>
  clientRuntime.fn(() => TodosClient.use((client) => client.remove(id)), {
    reactivityKeys: todosKeys,
  }),
);
