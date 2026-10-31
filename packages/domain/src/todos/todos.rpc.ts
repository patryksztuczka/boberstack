import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import { RpcAuthentication } from "../identity/authentication.ts";
import { TodoNotFoundError } from "./todo.errors.ts";
import { NewTodo, Todo, TodoId, TodoPatch } from "./todo.ts";

export class TodosRpcs extends RpcGroup.make(
  Rpc.make("ListTodos", { success: Schema.Array(Todo) }),
  Rpc.make("CreateTodo", { payload: NewTodo, success: Todo }),
  Rpc.make("UpdateTodo", {
    payload: Schema.Struct({ id: TodoId, patch: TodoPatch }),
    success: Todo,
    error: TodoNotFoundError,
  }),
  Rpc.make("RemoveTodo", { payload: Schema.Struct({ id: TodoId }), error: TodoNotFoundError }),
).middleware(RpcAuthentication) {}
