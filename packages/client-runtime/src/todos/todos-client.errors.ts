import { Schema } from "effect";

export class TodosUnavailableError extends Schema.TaggedError<
  TodosUnavailableError,
  { readonly brand: unique symbol }
>()("TodosUnavailableError", { reason: Schema.String }) {}
