import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const WEB_PORT = Number(process.env["DEV_WEB_PORT"] ?? "5173");

const LOCAL_API = `http://localhost:${process.env["DEV_API_PORT"] ?? "1337"}`;

export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["baseLocale"],
      emitTsDeclarations: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    port: WEB_PORT,
    strictPort: true,
    proxy: {
      "/api": {
        target: LOCAL_API,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (request) => request.setHeader("origin", LOCAL_API));
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    retry: 0,
    allowOnly: !process.env["CI"],
    passWithNoTests: false,
    fsModuleCachePath: "node_modules/.vitest-cache",
  },
});
