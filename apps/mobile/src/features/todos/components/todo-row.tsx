import type { Todo } from "@boberstack/domain/todos/todo";
import { Pressable, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { useRemoveTodo, useUpdateTodo } from "../api/todos.queries.ts";

export const TodoRow = ({ todo }: { readonly todo: Todo }) => {
  const update = useUpdateTodo();
  const remove = useRemoveTodo();

  return (
    <View className="flex-row items-center gap-3 border-b border-border py-3">
      <Pressable
        className="flex-1 flex-row items-center gap-3"
        onPress={() => update.mutate({ id: todo.id, patch: { completed: !todo.completed } })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
        accessibilityLabel={todo.title}
        testID={`todo-toggle-${todo.title}`}
      >
        <View
          className={
            todo.completed
              ? "size-[22px] items-center justify-center rounded-md border-[1.5px] border-primary bg-primary"
              : "size-[22px] items-center justify-center rounded-md border-[1.5px] border-primary"
          }
        >
          {todo.completed ? (
            <Text className="text-sm font-bold text-primary-foreground">✓</Text>
          ) : undefined}
        </View>
        <Text
          className={
            todo.completed
              ? "flex-1 text-base text-muted-foreground line-through"
              : "flex-1 text-base text-foreground"
          }
        >
          {todo.title}
        </Text>
      </Pressable>
      <Pressable
        className="px-2 py-1 active:opacity-50"
        onPress={() => remove.mutate(todo.id)}
        accessibilityRole="button"
        accessibilityLabel={`${m.todos_remove()} ${todo.title}`}
        hitSlop={8}
        testID={`todo-remove-${todo.title}`}
      >
        <Text className="text-sm text-destructive">{m.todos_remove()}</Text>
      </Pressable>
    </View>
  );
};
