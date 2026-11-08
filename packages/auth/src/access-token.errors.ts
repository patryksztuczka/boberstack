import { UserId } from "@boberstack/domain/identity/user";
import { Schema } from "effect";

export class InvalidAccessTokenError extends Schema.TaggedError<
  InvalidAccessTokenError,
  { readonly brand: unique symbol }
>()("InvalidAccessTokenError", { cause: Schema.Defect() }) {
  override get message(): string {
    return "invalid access token";
  }
}

export class SenderConstrainedAccessTokenError extends Schema.TaggedError<
  SenderConstrainedAccessTokenError,
  { readonly brand: unique symbol }
>()("SenderConstrainedAccessTokenError", {}) {
  override get message(): string {
    return "sender-constrained access tokens are not supported; request a Bearer access token";
  }
}

export class AccessTokenUserNotFoundError extends Schema.TaggedError<
  AccessTokenUserNotFoundError,
  { readonly brand: unique symbol }
>()("AccessTokenUserNotFoundError", { userId: UserId }) {
  override get message(): string {
    return "the access token names no User";
  }
}

export class AccessTokenVerificationUnavailableError extends Schema.TaggedError<
  AccessTokenVerificationUnavailableError,
  { readonly brand: unique symbol }
>()("AccessTokenVerificationUnavailableError", {
  operation: Schema.Literals(["readKeys", "readIssuer", "findUser"]),
  cause: Schema.Defect(),
}) {}

export type AccessTokenError =
  | InvalidAccessTokenError
  | SenderConstrainedAccessTokenError
  | AccessTokenUserNotFoundError
  | AccessTokenVerificationUnavailableError;
