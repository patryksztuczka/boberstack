import { TodosUnavailableError } from "@boberstack/client-runtime/todos";
import { useQuery } from "@tanstack/react-query";
import { Schema } from "effect";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { colors, radius, spacing } from "../../../shared/theme.ts";
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
      style={styles.list}
      contentContainerStyle={styles.content}
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
            <View style={styles.failure}>
              <Text style={styles.failureText}>
                {m.todos_failed({ reason: reasonOf(todos.error) })}
              </Text>
              <Pressable onPress={() => void todos.refetch()} accessibilityRole="button">
                <Text style={styles.retry}>{m.todos_retry()}</Text>
              </Pressable>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        todos.isSuccess ? <Text style={styles.muted}>{m.todos_empty()}</Text> : undefined
      }
      ListFooterComponent={
        items.length === 0 ? undefined : (
          <Text style={[styles.muted, styles.footer]}>
            {m.todos_remaining({ count: remaining })}
          </Text>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  failure: {
    gap: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius,
    backgroundColor: colors.muted,
  },
  failureText: { color: colors.destructive, fontSize: 14 },
  retry: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  muted: { color: colors.mutedForeground, fontSize: 14 },
  footer: { paddingTop: spacing.md },
});
