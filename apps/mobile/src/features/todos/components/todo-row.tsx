import type { Todo } from "@boberstack/domain/todos/todo";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { colors, spacing } from "../../../shared/theme.ts";
import { useRemoveTodo, useUpdateTodo } from "../api/todos.queries.ts";

export const TodoRow = ({ todo }: { readonly todo: Todo }) => {
  const update = useUpdateTodo();
  const remove = useRemoveTodo();

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.toggle}
        onPress={() => update.mutate({ id: todo.id, patch: { completed: !todo.completed } })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
        accessibilityLabel={todo.title}
        testID={`todo-toggle-${todo.title}`}
      >
        <View style={[styles.box, todo.completed && styles.boxChecked]}>
          {todo.completed ? <Text style={styles.check}>✓</Text> : undefined}
        </View>
        <Text style={[styles.title, todo.completed && styles.titleDone]}>{todo.title}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        onPress={() => remove.mutate(todo.id)}
        accessibilityRole="button"
        accessibilityLabel={`${m.todos_remove()} ${todo.title}`}
        hitSlop={spacing.sm}
        testID={`todo-remove-${todo.title}`}
      >
        <Text style={styles.removeText}>{m.todos_remove()}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toggle: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: colors.primary },
  check: { color: colors.primaryForeground, fontSize: 14, fontWeight: "700" },
  title: { flex: 1, fontSize: 16, color: colors.foreground },
  titleDone: { color: colors.mutedForeground, textDecorationLine: "line-through" },
  remove: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  pressed: { opacity: 0.5 },
  removeText: { color: colors.destructive, fontSize: 14 },
});
