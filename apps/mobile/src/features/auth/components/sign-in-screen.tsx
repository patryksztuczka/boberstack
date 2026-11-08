import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { authClient } from "../api/auth-client.ts";
import { clearSessionExpired, useSessionExpired } from "../api/session.ts";

export const SignInScreen = () => {
  const expired = useSessionExpired();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setFailure(undefined);

    const { error } = await authClient.signIn.email({ email: email.trim(), password });

    setSubmitting(false);

    if (error === null) {
      clearSessionExpired();
    } else {
      setFailure(m.auth_failed({ reason: error.message ?? error.statusText }));
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
      <ScrollView
        contentContainerClassName="gap-4 p-6"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-[32px] font-black text-brand">{m.app_title()}</Text>
        <Text className="text-base text-muted-foreground">{m.auth_sign_in_description()}</Text>
        {expired ? (
          <Text className="overflow-hidden rounded-lg bg-muted p-3 text-foreground">
            {m.auth_session_expired()}
          </Text>
        ) : undefined}
        <View className="gap-1">
          <Text className="text-sm font-semibold text-foreground">{m.auth_email()}</Text>
          <TextInput
            className="rounded-lg border border-border px-3 py-3 text-[16px] text-foreground"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel={m.auth_email()}
            testID="sign-in-email"
          />
        </View>
        <View className="gap-1">
          <Text className="text-sm font-semibold text-foreground">{m.auth_password()}</Text>
          <TextInput
            className="rounded-lg border border-border px-3 py-3 text-[16px] text-foreground"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            accessibilityLabel={m.auth_password()}
            testID="sign-in-password"
          />
        </View>
        {failure === undefined ? undefined : (
          <Text className="text-sm text-destructive">{failure}</Text>
        )}
        <Pressable
          className="items-center rounded-lg bg-primary py-3 active:opacity-60 disabled:opacity-60"
          onPress={() => void submit()}
          disabled={submitting}
          accessibilityRole="button"
          testID="sign-in-submit"
        >
          <Text className="text-base font-semibold text-primary-foreground">
            {m.auth_sign_in_submit()}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
