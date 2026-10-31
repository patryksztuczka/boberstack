import { Cause, Exit, Layer, ManagedRuntime } from "effect";
import type { Effect } from "effect";

import type { SignInMethodsClient } from "./features/auth/api/sign-in-methods-client.ts";
import { SignInMethodsHttpClientLayer } from "./features/auth/api/sign-in-methods-client.ts";
import type { TodosClient } from "./features/todos/api/todos-client.ts";
import { TodosHttpClientLayer } from "./features/todos/api/todos-http-client.ts";
import { TodosRpcClientLayer } from "./features/todos/api/todos-rpc-client.ts";

export type TodosTransport = "http" | "rpc";

export const TODOS_TRANSPORT: TodosTransport =
  import.meta.env.VITE_TODOS_TRANSPORT === "rpc" ? "rpc" : "http";

const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    TODOS_TRANSPORT === "rpc" ? TodosRpcClientLayer : TodosHttpClientLayer,
    SignInMethodsHttpClientLayer,
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
