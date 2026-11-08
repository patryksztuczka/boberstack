import { Schema } from "effect";

export class ClientLayerMissingError extends Schema.TaggedError<
  ClientLayerMissingError,
  { readonly brand: unique symbol }
>()("ClientLayerMissingError", { fix: Schema.String }) {}
