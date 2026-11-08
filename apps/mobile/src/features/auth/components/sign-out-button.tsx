import { Pressable, Text } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { signOut } from "../api/session.ts";

export const SignOutButton = () => (
  <Pressable
    onPress={() => void signOut()}
    accessibilityRole="button"
    hitSlop={8}
    testID="sign-out"
  >
    <Text className="text-base text-foreground">{m.auth_sign_out()}</Text>
  </Pressable>
);
