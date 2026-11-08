import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { CurrentUser } from "@boberstack/domain/identity/current-user";
import { APIError } from "better-auth/api";
import { parseAccessTokenAuthorization } from "better-auth/oauth2";
import { Effect, Option } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import { Auth } from "./better-auth.ts";

const MISSING_ACCESS_TOKEN = "missing access token; send a Bearer access token";

const AUTHENTICATION_UNAVAILABLE = "authentication is unavailable; try again later";

const jsonRpcError = (status: number, message: string, headers?: globalThis.Headers) =>
  HttpServerResponse.jsonUnsafe(
    { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
    { status, headers: headers ?? new globalThis.Headers() },
  );

const challenge = (resource: string, message: string) =>
  Effect.sync(() => {
    const refusal = createResourceServerChallenge(
      new APIError("UNAUTHORIZED", { message }),
      resource,
    );

    return jsonRpcError(
      refusal?.statusCode ?? 401,
      message,
      new globalThis.Headers(refusal?.headers),
    );
  });

const unavailable = Effect.succeed(jsonRpcError(503, AUTHENTICATION_UNAVAILABLE));

export const McpAuthenticationLayer = HttpRouter.middleware<{ provides: CurrentUser }>()(
  Effect.gen(function* () {
    const auth = yield* Auth;

    return (httpEffect) =>
      Effect.gen(function* () {
        if (Option.isNone(auth.mcpResourceServer)) {
          return yield* unavailable;
        }

        const { resource, accessTokenUserOf } = auth.mcpResourceServer.value;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const authorization = parseAccessTokenAuthorization(request.headers["authorization"]);

        if (authorization?.scheme !== "Bearer") {
          return yield* challenge(resource, MISSING_ACCESS_TOKEN);
        }

        return yield* accessTokenUserOf(authorization.token).pipe(
          Effect.flatMap((user) => Effect.provideService(httpEffect, CurrentUser, user)),
          Effect.catchTags({
            InvalidAccessTokenError: (error) => challenge(resource, error.message),
            SenderConstrainedAccessTokenError: (error) => challenge(resource, error.message),
            AccessTokenUserNotFoundError: (error) => challenge(resource, error.message),
            AccessTokenVerificationUnavailableError: (error) =>
              Effect.logError("mcp access token verification unavailable", error).pipe(
                Effect.andThen(unavailable),
              ),
          }),
        );
      });
  }),
).layer;
