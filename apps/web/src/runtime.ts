import { ApiOrigin } from "@boberstack/client-runtime/api-origin";
import { SignInMethodsHttpClientLayer } from "@boberstack/client-runtime/identity";
import type { SignInMethodsClient } from "@boberstack/client-runtime/identity";
import { TodosHttpClientLayer, TodosRpcClientLayer } from "@boberstack/client-runtime/todos";
import type { TodosClient } from "@boberstack/client-runtime/todos";
import { Cause, Exit, Layer, ManagedRuntime } from "effect";
import type { Effect } from "effect";
import { FetchHttpClient } from "effect/http";

export type TodosTransport = "http" | "rpc";

export const TODOS_TRANSPORT: TodosTransport =
  import.meta.env.VITE_TODOS_TRANSPORT === "rpc" ? "rpc" : "http";

const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    TODOS_TRANSPORT === "rpc" ? TodosRpcClientLayer : TodosHttpClientLayer,
    SignInMethodsHttpClientLayer,
  ).pipe(
    Layer.provide(ApiOrigin.layer(globalThis.location.origin)),
    Layer.provide(FetchHttpClient.layer),
  ),
);

export const runPromise = <A, E>(
  effect: Effect.Effect<A, E, TodosClient | SignInMethodsClient>,
  signal?: AbortSignal,
): Promise<A> =>
  runtime
    .runPromiseExit(effect, signal === undefined ? {} : { signal })
    .then((exit) => (Exit.isSuccess(exit) ? exit.value : Promise.reject(Cause.squash(exit.cause))));

if (import.meta.hot) {
  import.meta.hot.dispose(() => runtime.dispose());
}
