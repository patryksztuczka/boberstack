import { defineConfig } from "vite-plus";

const isExternal = (id: string) => id === "electron" || id.startsWith("electron/");

export default defineConfig({
  pack: {
    entry: ["src/main.ts"],
    format: "cjs",
    platform: "node",
    outDir: "dist",
    outExtensions: () => ({ js: ".cjs" }),
    dts: false,
    sourcemap: true,
    clean: true,
    outputOptions: { codeSplitting: false },
    deps: {
      alwaysBundle: (id) => !id.startsWith("node:") && !isExternal(id),
      neverBundle: isExternal,
      onlyBundle: false,
    },
  },
  test: {
    retry: 0,
    allowOnly: !process.env["CI"],
    passWithNoTests: false,
    fsModuleCachePath: "node_modules/.vitest-cache",
  },
});
