import { Api } from "@boberstack/domain/api";
import { SignInMethods } from "@boberstack/domain/identity/sign-in-methods";
import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { enabledProviders, SocialSignIn } from "../platform/authentication/social-sign-in.ts";

export const SignInMethodsHttpLayer = Layer.unwrap(
  SocialSignIn.use((social) => {
    const methods = new SignInMethods({
      emailVerificationRequired: true,
      socialProviders: enabledProviders(social),
    });

    return Effect.succeed(
      HttpApiBuilder.group(Api, "signInMethods", (handlers) =>
        handlers.handle("list", () => Effect.succeed(methods)),
      ),
    );
  }),
);
