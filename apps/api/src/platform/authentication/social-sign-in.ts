import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { Config, Context, Effect, Layer, Option } from "effect";
import type { Redacted } from "effect";

export interface OAuthCredentials {
  readonly clientId: string;
  readonly clientSecret: Redacted.Redacted;
}

export interface SocialSignInApi {
  readonly github: Option.Option<OAuthCredentials>;
  readonly google: Option.Option<OAuthCredentials>;
}

const credentials = (prefix: string) =>
  Config.all({
    clientId: Config.String(`${prefix}_CLIENT_ID`),
    clientSecret: Config.Redacted(`${prefix}_CLIENT_SECRET`),
  }).pipe(Config.option);

export const enabledProviders = (settings: SocialSignInApi): ReadonlyArray<SocialProvider> => [
  ...(Option.isSome(settings.github) ? (["github"] as const) : []),
  ...(Option.isSome(settings.google) ? (["google"] as const) : []),
];

export class SocialSignIn extends Context.Service<SocialSignIn, SocialSignInApi>()(
  "boberstack/platform/authentication/SocialSignIn",
) {
  static readonly layer = (settings: SocialSignInApi) => Layer.succeed(this, settings);

  static readonly layerConfig = Layer.unwrap(
    Effect.gen(function* () {
      const github = yield* credentials("GITHUB");
      const google = yield* credentials("GOOGLE");

      return SocialSignIn.layer({ github, google });
    }),
  );
}
