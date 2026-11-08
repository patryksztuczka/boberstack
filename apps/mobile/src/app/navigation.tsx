import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  SignInScreen,
  SignOutButton,
  useIsSignedIn,
  useIsSignedOut,
} from "../features/auth/index.ts";
import { TodosScreen } from "../features/todos/index.ts";
import { m } from "../paraglide/messages.js";
import { colors } from "../shared/theme.ts";

const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerTintColor: colors.foreground,
    contentStyle: { backgroundColor: colors.background },
  },
  screens: {
    SignIn: {
      if: useIsSignedOut,
      screen: SignInScreen,
      options: { title: m.auth_sign_in_title() },
    },
    Todos: {
      if: useIsSignedIn,
      screen: TodosScreen,
      options: { title: m.todos_title(), headerRight: () => <SignOutButton /> },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);
