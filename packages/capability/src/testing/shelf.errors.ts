import { Schema } from "effect";

import { BookId } from "./shelf-id.ts";

export class BookNotFoundError extends Schema.TaggedError<
  BookNotFoundError,
  { readonly brand: unique symbol }
>()("BookNotFoundError", { id: BookId }, { httpApiStatus: 404 }) {}

export class OutOfStockError extends Schema.TaggedError<
  OutOfStockError,
  { readonly brand: unique symbol }
>()("OutOfStockError", {
  id: BookId,
}) {}
