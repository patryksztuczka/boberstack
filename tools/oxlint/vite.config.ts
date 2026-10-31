import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    retry: 0,
    allowOnly: !process.env["CI"],
    passWithNoTests: false,
    fsModuleCachePath: "node_modules/.vitest-cache",
  },
});
