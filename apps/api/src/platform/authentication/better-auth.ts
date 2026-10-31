import { BetterAuth } from "@alchemy.run/better-auth";
import { RuntimeContext } from "alchemy";
import { Config, Context, Effect, Layer, Option } from "effect";
import type { Headers } from "effect/http";

const makeAuth = Effect.gen(function* () {
  const baseURL = yield* Config.String("AUTH_BASE_URL").pipe(Config.option);

  const betterAuth = yield* BetterAuth({
    basePath: "/api/auth",
    emailAndPassword: { enabled: true },
    baseURL: Option.getOrUndefined(baseURL),
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
