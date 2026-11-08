import { RegistryProvider } from "@effect/atom-react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "../../global.css";

import { useSessionLoading } from "../features/auth/index.ts";
import { clientAtoms } from "../runtime.ts";
import { useNavigationTheme } from "./navigation-theme.ts";
import { Navigation } from "./navigation.tsx";

void SplashScreen.preventAutoHideAsync();

const Root = () => {
  const loading = useSessionLoading();
  const theme = useNavigationTheme();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  return loading ? undefined : <Navigation theme={theme} />;
};

export const App = () => (
  <SafeAreaProvider>
    <RegistryProvider initialValues={clientAtoms}>
      <StatusBar style="dark" />
      <Root />
    </RegistryProvider>
  </SafeAreaProvider>
);
