import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { featureBoundariesRule } from "./rules/feature-boundaries.ts";

const frontendPlugin = eslintCompatPlugin({
  meta: { name: "frontend" },
  rules: {
    "feature-boundaries": featureBoundariesRule,
  },
});

export default frontendPlugin;
