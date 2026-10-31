import { defineConfig } from "vite-plus";

import lint from "./tools/oxlint/lint.config.ts";

export default defineConfig({
  lint,
  fmt: {
    printWidth: 100,
    sortPackageJson: true,
    sortImports: {},
    ignorePatterns: [
      "tools/oxlint/anti-slop/**",
      "apps/web/src/paraglide/**",
      ".scratch/**",
      "pnpm-lock.yaml",
    ],
  },
  staged: {
    "*": "vp check --fix",
  },
});
