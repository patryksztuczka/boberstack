import { HttpAuthentication, RpcAuthentication } from "@boberstack/domain/identity/authentication";
import {
  AuthenticationUnavailableError,
  UnauthorizedError,
} from "@boberstack/domain/identity/authentication.errors";
import { CurrentUser } from "@boberstack/domain/identity/current-user";
import { User, UserId } from "@boberstack/domain/identity/user";
import { Effect, Layer } from "effect";
import type { Headers } from "effect/http";
import { HttpServerRequest } from "effect/http";

import { Auth } from "./better-auth.ts";

const currentUserFrom = (auth: typeof Auth.Service, headers: Headers.Headers) =>
  auth.sessionOf(headers).pipe(
    Effect.mapError(() => new AuthenticationUnavailableError()),
    Effect.catchDefect(() => Effect.fail(new AuthenticationUnavailableError())),
    Effect.flatMap((session) =>
      session === null
        ? Effect.fail(new UnauthorizedError())
        : Effect.succeed(
            new User({
              id: UserId.make(session.user.id),
              name: session.user.name,
              email: session.user.email,
            }),
          ),
    ),
  );

export const HttpAuthenticationLayer = Layer.effect(
  HttpAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;

    return (httpEffect) =>
      HttpServerRequest.HttpServerRequest.use((request) =>
        currentUserFrom(auth, request.headers).pipe(
          Effect.flatMap((user) => Effect.provideService(httpEffect, CurrentUser, user)),
        ),
      );
  }),
);

export const RpcAuthenticationLayer = Layer.effect(
  RpcAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;

    return (rpcEffect, { headers }) =>
      currentUserFrom(auth, headers).pipe(
        Effect.flatMap((user) => Effect.provideService(rpcEffect, CurrentUser, user)),
      );
  }),
);
