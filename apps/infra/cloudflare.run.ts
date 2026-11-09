import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import { Effect, Layer } from "effect";

import Api from "./src/worker.ts";

const StateLayer = Layer.unwrap(
  Effect.gen(function* () {
    const dev = yield* Alchemy.ALCHEMY_DEV;

    return dev ? Alchemy.localState() : Cloudflare.state();
  }).pipe(Effect.orDie),
);

export default Alchemy.Stack(
  "Boberstack",
  {
    providers: Cloudflare.providers(),
    state: StateLayer,
  },
  Effect.gen(function* () {
    const api = yield* Api;

    return { url: api.url };
  }),
);
