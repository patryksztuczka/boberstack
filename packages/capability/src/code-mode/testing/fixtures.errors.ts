import { Schema } from "effect";

export class NotFoundError extends Schema.TaggedError<
  NotFoundError,
  { readonly brand: unique symbol }
>()("NotFoundError", {
  subject: Schema.String,
}) {
  override get message(): string {
    return `No one called ${this.subject}`;
  }
}

export class StorageBudgetExceededError extends Schema.TaggedError<
  StorageBudgetExceededError,
  { readonly brand: unique symbol }
>()("StorageBudgetExceededError", {
  message: Schema.String,
}) {}

export class ReadFailedError extends Schema.TaggedError<
  ReadFailedError,
  { readonly brand: unique symbol }
>()("ReadFailedError", {
  message: Schema.String,
}) {}
