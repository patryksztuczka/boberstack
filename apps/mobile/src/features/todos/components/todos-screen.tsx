import { createTodo, todos } from "@boberstack/client-runtime/todos";
import { useAtom, useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { NewTodoForm } from "../forms/new-todo-form.tsx";
import { failureMessage } from "./todo-failure.ts";
import { TodoRow } from "./todo-row.tsx";

export const TodosScreen = () => {
  const list = useAtomValue(todos);
  const refresh = useAtomRefresh(todos);
  const [created, create] = useAtom(createTodo, { mode: "promiseExit" });
  const items = Option.getOrElse(AsyncResult.value(list), () => []);
  const remaining = items.filter((todo) => !todo.completed).length;
  const listFailure = failureMessage(list);
  const createFailure = failureMessage(created);

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      data={items}
      keyExtractor={(todo) => todo.id}
      renderItem={({ item }) => <TodoRow todo={item} />}
      refreshControl={
        <RefreshControl
          refreshing={list.waiting && !AsyncResult.isInitial(list)}
          onRefresh={refresh}
        />
      }
      ListHeaderComponent={
        <View>
          <NewTodoForm onCreate={async (input) => Exit.isSuccess(await create(input))} />
          {createFailure === undefined ? undefined : (
            <Text className="mb-3 text-sm text-destructive">{createFailure}</Text>
          )}
          {listFailure === undefined ? undefined : (
            <View className="mb-3 gap-1 rounded-lg bg-muted p-3">
              <Text className="text-sm text-destructive">{listFailure}</Text>
              <Pressable onPress={refresh} accessibilityRole="button" testID="todos-retry">
                <Text className="text-sm font-semibold text-foreground">{m.todos_retry()}</Text>
              </Pressable>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        AsyncResult.isSuccess(list) ? (
          <Text className="text-sm text-muted-foreground">{m.todos_empty()}</Text>
        ) : undefined
      }
      ListFooterComponent={
        items.length === 0 ? undefined : (
          <Text className="pt-3 text-sm text-muted-foreground">
            {m.todos_remaining({ count: remaining })}
          </Text>
        )
      }
    />
  );
};
