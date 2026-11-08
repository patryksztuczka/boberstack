import { createTodo, todos } from "@boberstack/client-runtime/todos";
import { Button } from "@boberstack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@boberstack/ui/components/card";
import { useAtom, useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";

import { m } from "../../../paraglide/messages.js";
import { TODOS_TRANSPORT } from "../../../runtime.ts";
import { NewTodoForm } from "../forms/new-todo-form.tsx";
import { failureMessage } from "./todo-failure.ts";
import { TodoItem } from "./todo-item.tsx";

export const TodosPage = () => {
  const list = useAtomValue(todos);
  const refresh = useAtomRefresh(todos);
  const [created, create] = useAtom(createTodo, { mode: "promiseExit" });
  const items = Option.getOrUndefined(AsyncResult.value(list));
  const listFailure = failureMessage(list);
  const createFailure = failureMessage(created);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.todos_title()}</CardTitle>
        <CardDescription>
          {m.todos_transport({ transport: TODOS_TRANSPORT === "rpc" ? "Effect RPC" : "HttpApi" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4" aria-busy={list.waiting}>
        <NewTodoForm onCreate={async (input) => Exit.isSuccess(await create(input))} />
        {createFailure === undefined ? undefined : (
          <p role="alert" className="text-sm text-destructive">
            {createFailure}
          </p>
        )}
        {listFailure === undefined ? undefined : (
          <div role="alert" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-destructive">{listFailure}</span>
            <Button variant="outline" size="sm" onClick={refresh}>
              {m.todos_retry()}
            </Button>
          </div>
        )}
        {items === undefined ? undefined : (
          <>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{m.todos_empty()}</p>
            ) : (
              <ul className="divide-y">
                {items.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} />
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              {m.todos_remaining({ count: items.filter((todo) => !todo.completed).length })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
