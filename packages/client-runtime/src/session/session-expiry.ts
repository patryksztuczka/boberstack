import { Context, Effect, Layer } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

export const sessionExpiries = Atom.make(0).pipe(Atom.keepAlive);

export const onSessionExpired = (registry: AtomRegistry.AtomRegistry, expired: () => void) => {
  registry.get(sessionExpiries);

  return registry.subscribe(sessionExpiries, expired);
};

export interface SessionExpiryApi {
  readonly expire: Effect.Effect<void>;
}

export class SessionExpiry extends Context.Service<SessionExpiry, SessionExpiryApi>()(
  "boberstack/platform/client-runtime/session/SessionExpiry",
) {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const registry = yield* AtomRegistry.AtomRegistry;

      return SessionExpiry.of({
        expire: Effect.sync(() => registry.update(sessionExpiries, (count) => count + 1)),
      });
    }),
  );
}
