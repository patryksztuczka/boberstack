import { BetterAuth } from "@alchemy.run/better-auth";
import { expo } from "@better-auth/expo";
import { mcp } from "@better-auth/mcp";
import { confirmEmail, Mailer, resetPassword } from "@boberstack/core/mail";
import type { MailerApi } from "@boberstack/core/mail";
import { User, UserId } from "@boberstack/domain/identity/user";
import { RuntimeContext } from "alchemy";
import { getDpopJktFromPayload, verifyJwsAccessToken } from "better-auth/oauth2";
import { jwt } from "better-auth/plugins";
import { Config, Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import type { Headers } from "effect/http";

import {
  AccessTokenUserNotFoundError,
  AccessTokenVerificationUnavailableError,
  InvalidAccessTokenError,
  SenderConstrainedAccessTokenError,
} from "./access-token.errors.ts";
import type { AccessTokenError } from "./access-token.errors.ts";
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

const MOBILE_APP_ORIGINS = ["boberstack://", "boberstack-dev://", "boberstack-preview://"];

const trustedOriginsFrom = (value: string) => [
  ...MOBILE_APP_ORIGINS,
  ...value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== ""),
];

const MCP_PATH = "/api/mcp";

const mcpPlugins = (resource: string) => [
  jwt({ schema: { jwks: { modelName: "jwks" } } }),
  mcp({
    loginPage: "/sign-in",
    consentPage: "/oauth/consent",
    resource,
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    clientRegistrationDefaultApplicationType: "infer",
    schema: {
      oauthClient: { modelName: "oauthClients" },
      oauthResource: { modelName: "oauthResources" },
      oauthClientResource: { modelName: "oauthClientResources" },
      oauthRefreshToken: { modelName: "oauthRefreshTokens" },
      oauthAccessToken: { modelName: "oauthAccessTokens" },
      oauthConsent: { modelName: "oauthConsents" },
      oauthClientAssertion: { modelName: "oauthClientAssertions" },
    },
  }),
];

const AccessTokenSubject = Schema.Struct({ sub: Schema.String });

export interface McpResourceServerApi {
  readonly resource: string;
  readonly accessTokenUserOf: (token: string) => Effect.Effect<User, AccessTokenError>;
}

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

  const mcpResource = Option.map(baseURL, (origin) => new URL(MCP_PATH, origin).href);

  const betterAuth = yield* BetterAuth({
    basePath: "/api/auth",
    baseURL: Option.getOrUndefined(baseURL),
    trustedOrigins: trustedOriginsFrom(trustedOrigins),
    disabledPaths: ["/token"],
    plugins: [expo(), ...Option.match(mcpResource, { onNone: () => [], onSome: mcpPlugins })],
    user: { modelName: "users" },
    session: { modelName: "sessions" },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
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

  const accessTokenUserOf = (resource: string) =>
    Effect.fn("Auth.accessTokenUserOf")(function* (token: string) {
      const instance = yield* betterAuth.auth;

      const context = yield* Effect.tryPromise({
        try: () => instance.$context,
        catch: (cause) =>
          new AccessTokenVerificationUnavailableError({ operation: "readIssuer", cause }),
      });

      const keys = yield* betterAuth.api
        .getJwks()
        .pipe(
          Effect.mapError(
            (cause) =>
              new AccessTokenVerificationUnavailableError({ operation: "readKeys", cause }),
          ),
        );

      const claims = yield* Effect.tryPromise({
        try: () =>
          verifyJwsAccessToken(token, {
            jwksFetch: () => Promise.resolve(keys),
            verifyOptions: {
              issuer: context.baseURL,
              audience: resource,
              requiredClaims: ["azp"],
            },
          }),
        catch: (cause) => new InvalidAccessTokenError({ cause }),
      });

      if (getDpopJktFromPayload(claims) !== undefined) {
        return yield* new SenderConstrainedAccessTokenError();
      }

      const { sub } = yield* Schema.decodeUnknownEffect(AccessTokenSubject)(claims).pipe(
        Effect.mapError((cause) => new InvalidAccessTokenError({ cause })),
      );

      const user = yield* Effect.tryPromise({
        try: () => context.internalAdapter.findUserById(sub),
        catch: (cause) =>
          new AccessTokenVerificationUnavailableError({ operation: "findUser", cause }),
      });

      if (user === null) {
        return yield* new AccessTokenUserNotFoundError({ userId: UserId.make(sub) });
      }

      return new User({ id: UserId.make(user.id), name: user.name, email: user.email });
    }, Effect.provide(RuntimeContext.phantom));

  const mcpResourceServer = Option.map(mcpResource, (resource): McpResourceServerApi => ({
    resource,
    accessTokenUserOf: accessTokenUserOf(resource),
  }));

  return {
    handle: betterAuth.fetch.pipe(Effect.provide(RuntimeContext.phantom)),
    mcpResourceServer,
    sessionOf: (headers: Headers.Headers) =>
      betterAuth
        .getSession(new globalThis.Headers(Object.entries(headers)))
        .pipe(Effect.provide(RuntimeContext.phantom)),
  };
});

export class Auth extends Context.Service<Auth, Effect.Success<typeof makeAuth>>()(
  "boberstack/platform/auth/Auth",
) {
  static readonly layer = Layer.effect(this, makeAuth);
}
