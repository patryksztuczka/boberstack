import { enabledProviders, SocialSignIn } from "@boberstack/auth";
import { Api } from "@boberstack/domain/api";
import { SignInMethods } from "@boberstack/domain/identity/sign-in-methods";
import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/http-api";

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
