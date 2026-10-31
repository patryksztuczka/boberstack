import { Schema } from "effect";
import { HttpApiMiddleware } from "effect/http-api";
import { RpcMiddleware } from "effect/rpc";

import { AuthenticationUnavailableError, UnauthorizedError } from "./authentication.errors.ts";
import type { CurrentUser } from "./current-user.ts";

export class HttpAuthentication extends HttpApiMiddleware.Service<
  HttpAuthentication,
  { provides: CurrentUser }
>()("boberstack/domain/identity/HttpAuthentication", {
  error: [UnauthorizedError, AuthenticationUnavailableError],
}) {}

export class RpcAuthentication extends RpcMiddleware.Service<
  RpcAuthentication,
  { provides: CurrentUser }
>()("boberstack/domain/identity/RpcAuthentication", {
  error: Schema.Union([UnauthorizedError, AuthenticationUnavailableError]),
}) {}
