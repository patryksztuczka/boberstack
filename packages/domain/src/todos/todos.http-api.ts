import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api";

import { HttpAuthentication } from "../identity/authentication.ts";
import { TodoNotFoundError } from "./todo.errors.ts";
import { NewTodo, Todo, TodoId, TodoPatch } from "./todo.ts";

export class TodosHttpApi extends HttpApiGroup.make("todos")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(Todo),
    }),
    HttpApiEndpoint.post("create", "/", {
      payload: NewTodo,
      success: Todo.pipe(HttpApiSchema.status(201)),
    }),
    HttpApiEndpoint.patch("update", "/:id", {
      params: { id: TodoId },
      payload: TodoPatch,
      success: Todo,
      error: TodoNotFoundError,
    }),
    HttpApiEndpoint.delete("remove", "/:id", {
      params: { id: TodoId },
      success: HttpApiSchema.NoContent,
      error: TodoNotFoundError,
    }),
  )
  .middleware(HttpAuthentication)
  .prefix("/api/todos")
  .annotateMerge(OpenApi.annotations({ title: "Todos" })) {}
