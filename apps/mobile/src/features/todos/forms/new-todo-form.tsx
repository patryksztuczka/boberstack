import type { NewTodo } from "@boberstack/domain/todos/todo";
import { Option } from "effect";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { colors, radius, spacing } from "../../../shared/theme.ts";
import { newTodoFrom } from "./new-todo.schema.ts";

export const NewTodoForm = ({
  onCreate,
}: {
  readonly onCreate: (input: NewTodo) => Promise<void>;
}) => {
  const [title, setTitle] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const input = newTodoFrom(title);

    if (Option.isNone(input)) {
      setInvalid(true);

      return;
    }

    setInvalid(false);
    setSubmitting(true);

    const created = await onCreate(input.value).then(
      () => true,
      () => false,
    );

    if (created) setTitle("");

    setSubmitting(false);
  };

  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setInvalid(false);
          }}
          placeholder={m.todos_new_placeholder()}
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel={m.todos_new_placeholder()}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          testID="new-todo-title"
        />
        <Pressable
          style={({ pressed }) => [styles.button, (pressed || submitting) && styles.pressed]}
          onPress={() => void submit()}
          disabled={submitting}
          accessibilityRole="button"
          testID="new-todo-add"
        >
          <Text style={styles.buttonText}>{m.todos_add()}</Text>
        </Pressable>
      </View>
      {invalid ? <Text style={styles.error}>{m.todos_title_invalid()}</Text> : undefined}
    </View>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.sm, paddingBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  button: {
    justifyContent: "center",
    borderRadius: radius,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.6 },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "600" },
  error: { color: colors.destructive, fontSize: 14 },
});
