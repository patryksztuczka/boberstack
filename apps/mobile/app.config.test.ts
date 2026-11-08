import { describe, expect, it } from "vite-plus/test";

import { appConfig, appVariant } from "./app.config.ts";

describe("appVariant", () => {
  it("defaults to production", () => {
    expect(appVariant(undefined)).toBe("production");
  });

  it("refuses a name it does not know", () => {
    expect(() => appVariant("prod")).toThrow(
      "APP_VARIANT must be development, preview or production",
    );
  });
});

describe("appConfig", () => {
  it.each([
    ["development", "boberstack (dev)", "com.boberstack.app.dev", "boberstack-dev"],
    ["preview", "boberstack (preview)", "com.boberstack.app.preview", "boberstack-preview"],
    ["production", "boberstack", "com.boberstack.app", "boberstack"],
  ] as const)(
    "gives the %s variant its own name, identifiers and scheme",
    (variant, name, id, scheme) => {
      const config = appConfig(variant, "https://app.example.com");

      expect(config.name).toBe(name);
      expect(config.ios?.bundleIdentifier).toBe(id);
      expect(config.android?.package).toBe(id);
      expect(config.scheme).toBe(scheme);
      expect(config.extra).toStrictEqual({
        appVariant: variant,
        apiUrl: "https://app.example.com",
      });
    },
  );

  it("ships updates by native fingerprint", () => {
    expect(appConfig("production", undefined).runtimeVersion).toStrictEqual({
      policy: "fingerprint",
    });
  });

  it("explains motion access through the expo-sensors plugin", () => {
    expect(appConfig("production", undefined).plugins).toContainEqual([
      "expo-sensors",
      { motionPermission: expect.stringContaining("tilt") },
    ]);
  });
});
