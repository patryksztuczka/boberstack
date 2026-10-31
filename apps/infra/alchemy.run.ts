import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Neon from "@alchemy.run/neon";
import Api from "@boberstack/api/worker";
import * as Alchemy from "alchemy";
import { Effect, Layer } from "effect";

const StateLayer = Layer.unwrap(
  Effect.gen(function* () {
    const dev = yield* Alchemy.ALCHEMY_DEV;

    return dev ? Alchemy.localState() : Cloudflare.state();
  }).pipe(Effect.orDie),
);

export default Alchemy.Stack(
  "Boberstack",
  {
    providers: Neon.providers().pipe(Layer.provideMerge(Cloudflare.providers())),
    state: StateLayer,
  },
  Effect.gen(function* () {
    const api = yield* Api;

    return { url: api.url };
  }),
);
