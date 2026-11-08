import { Schema } from "effect";

export class SignInMethodsUnavailableError extends Schema.TaggedError<
  SignInMethodsUnavailableError,
  { readonly brand: unique symbol }
>()("SignInMethodsUnavailableError", { reason: Schema.String }) {}
