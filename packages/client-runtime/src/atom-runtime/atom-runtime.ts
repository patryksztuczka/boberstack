import { Effect, Layer } from "effect";
import { Atom } from "effect/reactivity";

import type { McpClientDirectory, SignInMethodsClient } from "../identity/index.ts";
import { SessionExpiry } from "../session/index.ts";
import type { TodosClient } from "../todos/index.ts";
import { ClientLayerMissingError } from "./atom-runtime.errors.ts";

export type ClientServices = TodosClient | SignInMethodsClient | McpClientDirectory;

export type ClientLayer = Layer.Layer<ClientServices, never, SessionExpiry>;

const layerUnset: ClientLayer = Layer.effectContext(
  Effect.die(
    new ClientLayerMissingError({
      fix: "Seed the app's AtomRegistry with Atom.initialValue(clientLayer, <the app's client layer>).",
    }),
  ),
);

export const clientLayer = Atom.make<ClientLayer>(layerUnset).pipe(Atom.keepAlive);

export const clientRuntime = Atom.runtime((get) =>
  get(clientLayer).pipe(Layer.provide(SessionExpiry.layer)),
);
