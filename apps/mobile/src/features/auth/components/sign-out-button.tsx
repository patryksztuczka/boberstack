import { useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { colors } from "../../../shared/theme.ts";
import { signOut } from "../api/session.ts";

export const SignOutButton = () => {
  const queryClient = useQueryClient();

  return (
    <Pressable
      onPress={() => void signOut().then(() => queryClient.clear())}
      accessibilityRole="button"
      hitSlop={8}
      testID="sign-out"
    >
      <Text style={styles.text}>{m.auth_sign_out()}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: { color: colors.foreground, fontSize: 16 },
});
