import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "../../global.css";

import { expireSession, useSessionLoading } from "../features/auth/index.ts";
import { queryClient } from "../shared/query-client.ts";
import { useNavigationTheme } from "./navigation-theme.ts";
import { Navigation } from "./navigation.tsx";
import { watchSessionExpiry } from "./session-expiry.ts";

void SplashScreen.preventAutoHideAsync();

const Root = () => {
  const loading = useSessionLoading();
  const theme = useNavigationTheme();

  useEffect(() => watchSessionExpiry(queryClient, expireSession), []);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  return loading ? undefined : <Navigation theme={theme} />;
};

export const App = () => (
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Root />
    </QueryClientProvider>
  </SafeAreaProvider>
);
