import { defineContract, toHttpApiGroup, toRpcGroup, toToolkit } from "@boberstack/capability";
import { Schema } from "effect";
import { OpenApi } from "effect/http-api";

import { HttpAuthentication, RpcAuthentication } from "../identity/authentication.ts";
import { TodoNotFoundError } from "./todo.errors.ts";
import { NewTodo, Todo, TodoId, TodoPatch } from "./todo.ts";

export const ListTodos = defineContract("listTodos", {
  title: "List todos",
  description:
    "List every Todo of the signed-in User, oldest first. Each Todo has an id, a title, whether it is done (completed) and when it was created. Call this first to find the id of a Todo to update or remove.",
  input: Schema.Struct({}),
  output: Schema.Struct({ todos: Schema.Array(Todo) }),
  failure: Schema.Never,
  annotations: { readOnly: true, idempotent: true },
  http: { method: "GET", path: "/" },
});

export const CreateTodo = defineContract("createTodo", {
  title: "Create a todo",
  description:
    "Create a new Todo for the signed-in User. The title is trimmed and must be 1 to 200 characters. A new Todo is not done. Returns the created Todo with its id.",
  input: NewTodo,
  output: Todo,
  failure: Schema.Never,
  http: { method: "POST", path: "/", status: 201 },
});

export const UpdateTodo = defineContract("updateTodo", {
  title: "Update a todo",
  description:
    "Change the title of a Todo, mark it done or not done, or both. Pass the Todo id from listTodos and only the fields to change: title (1 to 200 characters) and completed (true for done). Returns the updated Todo, or a TodoNotFoundError when the signed-in User has no Todo with that id.",
  input: Schema.Struct({ id: TodoId, ...TodoPatch.fields }),
  output: Todo,
  failure: TodoNotFoundError,
  annotations: { idempotent: true },
  http: { method: "PATCH", path: "/:id" },
});

export const RemoveTodo = defineContract("removeTodo", {
  title: "Remove a todo",
  description:
    "Delete a Todo for good; there is no undo. Pass the Todo id from listTodos. Fails with a TodoNotFoundError when the signed-in User has no Todo with that id.",
  input: Schema.Struct({ id: TodoId }),
  output: Schema.Void,
  failure: TodoNotFoundError,
  annotations: { destructive: true },
  http: { method: "DELETE", path: "/:id" },
});

export const TodosContracts = [ListTodos, CreateTodo, UpdateTodo, RemoveTodo] as const;

export class TodosHttpApi extends toHttpApiGroup("todos", TodosContracts)
  .middleware(HttpAuthentication)
  .prefix("/api/todos")
  .annotateMerge(OpenApi.annotations({ title: "Todos" })) {}

export class TodosRpcs extends toRpcGroup(TodosContracts).middleware(RpcAuthentication) {}

export const TodosToolkit = toToolkit(TodosContracts);
