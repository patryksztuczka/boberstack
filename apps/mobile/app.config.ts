import type { ExpoConfig } from "expo/config";

export type AppVariant = "development" | "preview" | "production";

interface Variant {
  readonly name: string;
  readonly identifier: string;
  readonly scheme: string;
}

export const VARIANTS: Readonly<Record<AppVariant, Variant>> = {
  development: {
    name: "boberstack (dev)",
    identifier: "com.boberstack.app.dev",
    scheme: "boberstack-dev",
  },
  preview: {
    name: "boberstack (preview)",
    identifier: "com.boberstack.app.preview",
    scheme: "boberstack-preview",
  },
  production: {
    name: "boberstack",
    identifier: "com.boberstack.app",
    scheme: "boberstack",
  },
};

export const appVariant = (value: string | undefined): AppVariant => {
  if (value === undefined || value === "production") return "production";

  if (value === "development" || value === "preview") return value;

  throw new Error(
    `APP_VARIANT must be development, preview or production, got "${value}". Leave it unset for production.`,
  );
};

const WHITE = "#ffffff";

const MOTION_USAGE = "The beaver on the welcome screen looks around as you tilt your phone.";

export const appConfig = (variant: AppVariant, apiUrl: string | undefined): ExpoConfig => {
  const { name, identifier, scheme } = VARIANTS[variant];

  return {
    name,
    slug: "boberstack",
    scheme,
    version: "0.1.0",
    platforms: ["ios", "android"],
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/icon.png",
    runtimeVersion: { policy: "fingerprint" },
    updates: { checkAutomatically: "ON_LOAD", fallbackToCacheTimeout: 0 },
    ios: {
      bundleIdentifier: identifier,
      supportsTablet: true,
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: identifier,
      adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: WHITE },
    },
    plugins: [
      "expo-secure-store",
      ["expo-sensors", { motionPermission: MOTION_USAGE }],
      [
        "expo-splash-screen",
        { image: "./assets/splash-icon.png", imageWidth: 200, backgroundColor: WHITE },
      ],
    ],
    extra: { appVariant: variant, apiUrl: apiUrl ?? null },
  };
};

process.env["EXPO_NO_TYPESCRIPT_SETUP"] = "1";

export default appConfig(
  appVariant(process.env["APP_VARIANT"]),
  process.env["EXPO_PUBLIC_API_URL"],
);
