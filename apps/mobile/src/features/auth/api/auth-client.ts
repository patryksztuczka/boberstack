import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { API_ORIGIN, APP_SCHEME } from "../../../shared/app-config.ts";

export const authClient = createAuthClient({
  baseURL: API_ORIGIN,
  basePath: "/api/auth",
  plugins: [expoClient({ scheme: APP_SCHEME, storagePrefix: "boberstack", storage: SecureStore })],
});

export const sessionCookie = () => authClient.getCookie();
