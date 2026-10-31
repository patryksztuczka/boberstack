import type { Todo } from "@boberstack/domain/todos/todo";
import { Button } from "@boberstack/ui/components/button";
import { Checkbox } from "@boberstack/ui/components/checkbox";
import { Label } from "@boberstack/ui/components/label";
import { Trash2Icon } from "lucide-react";

import { m } from "../../../paraglide/messages.js";
import { useRemoveTodo, useUpdateTodo } from "../api/todos.queries.ts";

export const TodoItem = ({ todo }: { readonly todo: Todo }) => {
  const update = useUpdateTodo();
  const remove = useRemoveTodo();
  const checkboxId = `todo-${todo.id}`;

  return (
    <li className="flex items-center gap-3 py-2">
      <Checkbox
        id={checkboxId}
        checked={todo.completed}
        onCheckedChange={(checked) =>
          update.mutate({ id: todo.id, patch: { completed: checked === true } })
        }
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
        onClick={() => remove.mutate(todo.id)}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
};
