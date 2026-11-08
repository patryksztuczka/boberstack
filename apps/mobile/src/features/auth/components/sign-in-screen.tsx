import { useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { m } from "../../../paraglide/messages.js";
import { colors, radius, spacing } from "../../../shared/theme.ts";
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
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>{m.app_title()}</Text>
        <Text style={styles.description}>{m.auth_sign_in_description()}</Text>
        {expired ? <Text style={styles.notice}>{m.auth_session_expired()}</Text> : undefined}
        <View style={styles.field}>
          <Text style={styles.label}>{m.auth_email()}</Text>
          <TextInput
            style={styles.input}
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
        <View style={styles.field}>
          <Text style={styles.label}>{m.auth_password()}</Text>
          <TextInput
            style={styles.input}
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
        {failure === undefined ? undefined : <Text style={styles.error}>{failure}</Text>}
        <Pressable
          style={({ pressed }) => [styles.button, (pressed || submitting) && styles.pressed]}
          onPress={() => void submit()}
          disabled={submitting}
          accessibilityRole="button"
          testID="sign-in-submit"
        >
          <Text style={styles.buttonText}>{m.auth_sign_in_submit()}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.xl },
  brand: { color: colors.brand, fontSize: 32, fontWeight: "900" },
  description: { color: colors.mutedForeground, fontSize: 16 },
  notice: {
    padding: spacing.md,
    borderRadius: radius,
    color: colors.foreground,
    backgroundColor: colors.muted,
    overflow: "hidden",
  },
  field: { gap: spacing.xs },
  label: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.foreground,
  },
  error: { color: colors.destructive, fontSize: 14 },
  button: {
    alignItems: "center",
    borderRadius: radius,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.6 },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "600" },
});
