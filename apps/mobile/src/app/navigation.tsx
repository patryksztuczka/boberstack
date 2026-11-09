import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  SignInScreen,
  SignOutButton,
  useIsSignedIn,
  useIsSignedOut,
  useShowsWelcome,
} from "../features/auth/index.ts";
import { TodosScreen } from "../features/todos/index.ts";
import { WelcomeScreen } from "../features/welcome/index.ts";
import { m } from "../paraglide/messages.js";
import { SessionAtoms } from "./session-atoms.tsx";

const RootStack = createNativeStackNavigator({
  layout: ({ children }) => <SessionAtoms>{children}</SessionAtoms>,
  screens: {
    Welcome: {
      if: useShowsWelcome,
      screen: WelcomeScreen,
      options: { title: m.app_title(), headerShown: false },
    },
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
