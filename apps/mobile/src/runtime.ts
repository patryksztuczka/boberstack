import { ApiOrigin } from "@boberstack/client-runtime/api-origin";
import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import type { ClientLayer } from "@boberstack/client-runtime/atom-runtime";
import { SignInMethodsHttpClientLayer } from "@boberstack/client-runtime/identity";
import { TodosHttpClientLayer } from "@boberstack/client-runtime/todos";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { sessionCookie } from "./features/auth/api/auth-client.ts";
import { withSessionCookie } from "./features/auth/api/session-fetch.ts";
import { API_ORIGIN } from "./shared/app-config.ts";

const SessionFetchLayer = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.map(FetchHttpClient.Fetch, (fetch) => withSessionCookie(fetch, sessionCookie)),
);

const MobileClientLayer: ClientLayer = Layer.mergeAll(
  TodosHttpClientLayer,
  SignInMethodsHttpClientLayer,
).pipe(
  Layer.provide(ApiOrigin.layer(API_ORIGIN)),
  Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(SessionFetchLayer))),
);

export const clientAtoms = [Atom.initialValue(clientLayer, MobileClientLayer)];
