import { BetterAuth } from "@alchemy.run/better-auth";
import { RuntimeContext } from "alchemy";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";
import type { Headers } from "effect/http";

import { confirmEmail, Mailer, resetPassword } from "../../modules/mail/index.ts";
import type { MailerApi } from "../../modules/mail/index.ts";
import { SocialSignIn } from "./social-sign-in.ts";
import type { OAuthCredentials } from "./social-sign-in.ts";

interface AccountMailUser {
  readonly name: string;
  readonly email: string;
}

type AccountMailTemplate = typeof confirmEmail;

const providerOptions = (credentials: Option.Option<OAuthCredentials>) =>
  Option.match(credentials, {
    onNone: () => ({ enabled: false, clientId: "", clientSecret: "" }),
    onSome: ({ clientId, clientSecret }) => ({
      enabled: true,
      clientId,
      clientSecret: Redacted.value(clientSecret),
    }),
  });

const VERIFICATION_LINK_SECONDS = 24 * 60 * 60;

const RESET_LINK_SECONDS = 60 * 60;

const trustedOriginsFrom = (value: string) =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");

const makeAuth = Effect.gen(function* () {
  const baseURL = yield* Config.String("AUTH_BASE_URL").pipe(Config.option);
  const trustedOrigins = yield* Config.String("AUTH_TRUSTED_ORIGINS").pipe(Config.withDefault(""));
  const social = yield* SocialSignIn;
  const mailer: MailerApi = yield* Mailer;
  const context = yield* Effect.context<never>();

  const deliver = (template: AccountMailTemplate, user: AccountMailUser, url: string) => {
    const mail = template({
      name: user.name,
      email: user.email,
      url,
      appUrl: new URL(url).origin,
    });

    const sending = mailer
      .send({ to: { email: user.email, name: user.name }, ...mail })
      .pipe(Effect.tapError((error) => Effect.logError("account mail failed", error)));

    // BRIDGE: better-auth awaits a Promise from its mail callbacks before it answers the request
    return Effect.runPromiseWith(context)(sending);
  };

  const betterAuth = yield* BetterAuth({
    basePath: "/api/auth",
    baseURL: Option.getOrUndefined(baseURL),
    trustedOrigins: trustedOriginsFrom(trustedOrigins),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: RESET_LINK_SECONDS,
      sendResetPassword: ({ user, url }) => deliver(resetPassword, user, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: VERIFICATION_LINK_SECONDS,
      sendVerificationEmail: ({ user, url }) => deliver(confirmEmail, user, url),
    },
    socialProviders: {
      github: providerOptions(social.github),
      google: providerOptions(social.google),
    },
  });

  return {
    handle: betterAuth.fetch.pipe(Effect.provide(RuntimeContext.phantom)),
    sessionOf: (headers: Headers.Headers) =>
      betterAuth
        .getSession(new globalThis.Headers(Object.entries(headers)))
        .pipe(Effect.provide(RuntimeContext.phantom)),
  };
});

export class Auth extends Context.Service<Auth, Effect.Success<typeof makeAuth>>()(
  "boberstack/platform/authentication/Auth",
) {
  static readonly layer = Layer.effect(this, makeAuth);
}
