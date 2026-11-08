import { TodosUnavailableError } from "@boberstack/client-runtime/todos";
import { useQuery } from "@tanstack/react-query";
import { Schema } from "effect";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { todosQuery, useCreateTodo } from "../api/todos.queries.ts";
import { NewTodoForm } from "../forms/new-todo-form.tsx";
import { TodoRow } from "./todo-row.tsx";

const isUnavailable = Schema.is(TodosUnavailableError);

const reasonOf = (error: Error) => (isUnavailable(error) ? error.reason : error.message);

export const TodosScreen = () => {
  const todos = useQuery(todosQuery);
  const create = useCreateTodo();
  const [refreshing, setRefreshing] = useState(false);
  const items = todos.data ?? [];
  const remaining = items.filter((todo) => !todo.completed).length;

  const refresh = async () => {
    setRefreshing(true);
    await todos.refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      data={items}
      keyExtractor={(todo) => todo.id}
      renderItem={({ item }) => <TodoRow todo={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      ListHeaderComponent={
        <View>
          <NewTodoForm
            onCreate={async (input) => {
              await create.mutateAsync(input);
            }}
          />
          {todos.error === null ? undefined : (
            <View className="mb-3 gap-1 rounded-lg bg-muted p-3">
              <Text className="text-sm text-destructive">
                {m.todos_failed({ reason: reasonOf(todos.error) })}
              </Text>
              <Pressable onPress={() => void todos.refetch()} accessibilityRole="button">
                <Text className="text-sm font-semibold text-foreground">{m.todos_retry()}</Text>
              </Pressable>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        todos.isSuccess ? (
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
