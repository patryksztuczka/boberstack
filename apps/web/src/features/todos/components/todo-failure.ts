import type { TodosClientError } from "@boberstack/client-runtime/todos";
import type { TodoNotFoundError } from "@boberstack/domain/todos/todo.errors";
import { Match } from "effect";
import { AsyncResult } from "effect/reactivity";

import { m } from "../../../paraglide/messages.js";

export const failureMessage = <A>(
  result: AsyncResult.AsyncResult<A, TodosClientError | TodoNotFoundError>,
): string | undefined =>
  AsyncResult.matchWithError(result, {
    onInitial: () => undefined,
    onSuccess: () => undefined,
    onError: (error) =>
      Match.valueTags(error, {
        UnauthorizedError: () => undefined,
        TodosUnavailableError: ({ reason }) => m.todos_failed({ reason }),
        TodoNotFoundError: () => m.todos_not_found(),
      }),
    onDefect: (defect) => m.todos_failed({ reason: String(defect) }),
  });
