import type { NewTodo } from "@boberstack/domain/todos/todo";
import { Option } from "effect";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { newTodoFrom } from "./new-todo.schema.ts";

export const NewTodoForm = ({
  onCreate,
}: {
  readonly onCreate: (input: NewTodo) => Promise<boolean>;
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

    const created = await onCreate(input.value);

    if (created) setTitle("");

    setSubmitting(false);
  };

  return (
    <View className="gap-2 pb-3">
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[16px] text-foreground"
          placeholderTextColorClassName="accent-muted-foreground"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setInvalid(false);
          }}
          placeholder={m.todos_new_placeholder()}
          accessibilityLabel={m.todos_new_placeholder()}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          testID="new-todo-title"
        />
        <Pressable
          className="justify-center rounded-lg bg-primary px-4 active:opacity-60 disabled:opacity-60"
          onPress={() => void submit()}
          disabled={submitting}
          accessibilityRole="button"
          testID="new-todo-add"
        >
          <Text className="text-base font-semibold text-primary-foreground">{m.todos_add()}</Text>
        </Pressable>
      </View>
      {invalid ? (
        <Text className="text-sm text-destructive">{m.todos_title_invalid()}</Text>
      ) : undefined}
    </View>
  );
};
