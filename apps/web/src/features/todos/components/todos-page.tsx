import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@boberstack/ui/components/card";
import { useSuspenseQuery } from "@tanstack/react-query";

import { m } from "../../../paraglide/messages.js";
import { TODOS_TRANSPORT } from "../../../runtime.ts";
import { todosQuery, useCreateTodo } from "../api/todos.queries.ts";
import { NewTodoForm } from "../forms/new-todo-form.tsx";
import { TodoItem } from "./todo-item.tsx";

export const TodosPage = () => {
  const { data: todos } = useSuspenseQuery(todosQuery);
  const create = useCreateTodo();
  const remaining = todos.filter((todo) => !todo.completed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.todos_title()}</CardTitle>
        <CardDescription>
          {m.todos_transport({ transport: TODOS_TRANSPORT === "rpc" ? "Effect RPC" : "HttpApi" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <NewTodoForm
          onCreate={async (input) => {
            await create.mutateAsync(input);
          }}
        />
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.todos_empty()}</p>
        ) : (
          <ul className="divide-y">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">{m.todos_remaining({ count: remaining })}</p>
      </CardContent>
    </Card>
  );
};
