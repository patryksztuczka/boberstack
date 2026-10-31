import type { NewTodo } from "@boberstack/domain/todos/todo";
import { Button } from "@boberstack/ui/components/button";
import { Input } from "@boberstack/ui/components/input";
import { effectTsResolver } from "@hookform/resolvers/effect-ts";
import { useForm, useFormState } from "react-hook-form";

import { m } from "../../../paraglide/messages.js";
import { NewTodoForm as NewTodoFormSchema } from "./new-todo-form.schema.ts";
import type { NewTodoFormValues } from "./new-todo-form.schema.ts";

export const NewTodoForm = ({
  onCreate,
}: {
  readonly onCreate: (input: NewTodo) => Promise<void>;
}) => {
  const form = useForm<NewTodoFormValues, unknown, NewTodo>({
    resolver: effectTsResolver(NewTodoFormSchema),
    defaultValues: { title: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });
  const titleError = errors.title;

  return (
    <form
      noValidate
      className="grid gap-2"
      onSubmit={form.handleSubmit(async (input) => {
        await onCreate(input);
        form.resetField("title");
      })}
    >
      <div className="flex gap-2">
        <Input
          aria-label={m.todos_new_placeholder()}
          aria-invalid={titleError === undefined ? undefined : true}
          placeholder={m.todos_new_placeholder()}
          {...form.register("title")}
        />
        <Button type="submit" disabled={isSubmitting}>
          {m.todos_add()}
        </Button>
      </div>
      {titleError === undefined ? undefined : (
        <p role="alert" className="text-sm text-destructive">
          {m.todos_title_invalid()}
        </p>
      )}
    </form>
  );
};
