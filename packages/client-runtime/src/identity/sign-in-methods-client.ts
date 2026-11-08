import { Api } from "@boberstack/domain/api";
import type { SignInMethods } from "@boberstack/domain/identity/sign-in-methods";
import { Context, Effect, Layer } from "effect";
import type { Effect as EffectType } from "effect";
import { HttpApiClient } from "effect/http-api";

import { ApiOrigin } from "../api-origin/index.ts";
import { SignInMethodsUnavailableError } from "./sign-in-methods-client.errors.ts";

export interface SignInMethodsClientApi {
  readonly list: EffectType.Effect<SignInMethods, SignInMethodsUnavailableError>;
}

export class SignInMethodsClient extends Context.Service<
  SignInMethodsClient,
  SignInMethodsClientApi
>()("boberstack/platform/client-runtime/identity/SignInMethodsClient") {}

const unavailable = (error: { readonly message: string }) =>
  Effect.fail(new SignInMethodsUnavailableError({ reason: error.message }));

export const SignInMethodsHttpClientLayer = Layer.effect(
  SignInMethodsClient,
  Effect.gen(function* () {
    const { origin } = yield* ApiOrigin;
    const client = yield* HttpApiClient.make(Api, { baseUrl: origin });

    return SignInMethodsClient.of({
      list: client.signInMethods
        .list()
        .pipe(Effect.catchTags({ HttpClientError: unavailable, SchemaError: unavailable })),
    });
  }),
);
