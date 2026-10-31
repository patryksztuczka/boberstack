import { Schema } from "effect";

export class UnauthorizedError extends Schema.TaggedError<
  UnauthorizedError,
  { readonly brand: unique symbol }
>()("UnauthorizedError", {}, { httpApiStatus: 401 }) {}

export class AuthenticationUnavailableError extends Schema.TaggedError<
  AuthenticationUnavailableError,
  { readonly brand: unique symbol }
>()("AuthenticationUnavailableError", {}, { httpApiStatus: 503 }) {}
