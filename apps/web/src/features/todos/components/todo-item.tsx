import { removeTodo, updateTodo } from "@boberstack/client-runtime/todos";
import type { Todo } from "@boberstack/domain/todos/todo";
import { Button } from "@boberstack/ui/components/button";
import { Checkbox } from "@boberstack/ui/components/checkbox";
import { Label } from "@boberstack/ui/components/label";
import { useAtom } from "@effect/atom-react";
import { Trash2Icon } from "lucide-react";

import { m } from "../../../paraglide/messages.js";
import { failureMessage } from "./todo-failure.ts";

export const TodoItem = ({ todo }: { readonly todo: Todo }) => {
  const [updated, update] = useAtom(updateTodo(todo.id));
  const [removed, remove] = useAtom(removeTodo(todo.id));
  const failure = failureMessage(updated) ?? failureMessage(removed);
  const checkboxId = `todo-${todo.id}`;

  return (
    <li className="grid gap-1 py-2">
      <div className="flex items-center gap-3">
        <Checkbox
          id={checkboxId}
          checked={todo.completed}
          onCheckedChange={(checked) => update({ completed: checked === true })}
        />
        <Label
          htmlFor={checkboxId}
          className={todo.completed ? "flex-1 text-muted-foreground line-through" : "flex-1"}
        >
          {todo.title}
        </Label>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.todos_remove()}
          onClick={() => remove(undefined)}
        >
          <Trash2Icon />
        </Button>
      </div>
      {failure === undefined ? undefined : (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
    </li>
  );
};
