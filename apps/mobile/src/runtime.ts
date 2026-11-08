import { ApiOrigin } from "@boberstack/client-runtime/api-origin";
import { TodosHttpClientLayer } from "@boberstack/client-runtime/todos";
import type { TodosClient } from "@boberstack/client-runtime/todos";
import { Cause, Effect, Exit, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/http";

import { sessionCookie } from "./features/auth/api/auth-client.ts";
import { withSessionCookie } from "./features/auth/api/session-fetch.ts";
import { API_ORIGIN } from "./shared/app-config.ts";

const SessionFetchLayer = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.map(FetchHttpClient.Fetch, (fetch) => withSessionCookie(fetch, sessionCookie)),
);

const runtime = ManagedRuntime.make(
  TodosHttpClientLayer.pipe(
    Layer.provide(ApiOrigin.layer(API_ORIGIN)),
    Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(SessionFetchLayer))),
  ),
);

export const runPromise = <A, E>(
  effect: Effect.Effect<A, E, TodosClient>,
  signal?: AbortSignal,
): Promise<A> =>
  runtime
    .runPromiseExit(effect, signal === undefined ? {} : { signal })
    .then((exit) => (Exit.isSuccess(exit) ? exit.value : Promise.reject(Cause.squash(exit.cause))));
