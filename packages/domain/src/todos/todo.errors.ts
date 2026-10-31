import { Schema } from "effect";

import { TodoId } from "./todo.ts";

export class TodoNotFoundError extends Schema.TaggedError<
  TodoNotFoundError,
  { readonly brand: unique symbol }
>()("TodoNotFoundError", { id: TodoId }, { httpApiStatus: 404 }) {}
