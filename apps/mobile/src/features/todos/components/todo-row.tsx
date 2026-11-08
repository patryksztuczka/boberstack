import { removeTodo, updateTodo } from "@boberstack/client-runtime/todos";
import type { Todo } from "@boberstack/domain/todos/todo";
import { useAtom } from "@effect/atom-react";
import { Pressable, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { failureMessage } from "./todo-failure.ts";

export const TodoRow = ({ todo }: { readonly todo: Todo }) => {
  const [updated, update] = useAtom(updateTodo(todo.id));
  const [removed, remove] = useAtom(removeTodo(todo.id));
  const failure = failureMessage(updated) ?? failureMessage(removed);

  return (
    <View className="gap-1 border-b border-border py-3">
      <View className="flex-row items-center gap-3">
        <Pressable
          className="flex-1 flex-row items-center gap-3"
          onPress={() => update({ completed: !todo.completed })}
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
          onPress={() => remove(undefined)}
          accessibilityRole="button"
          accessibilityLabel={`${m.todos_remove()} ${todo.title}`}
          hitSlop={8}
          testID={`todo-remove-${todo.title}`}
        >
          <Text className="text-sm text-destructive">{m.todos_remove()}</Text>
        </Pressable>
      </View>
      {failure === undefined ? undefined : (
        <Text className="text-sm text-destructive">{failure}</Text>
      )}
    </View>
  );
};
