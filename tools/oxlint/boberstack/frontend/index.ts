import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { accessibleControlsRule } from "./rules/accessible-controls.ts";
import { featureBoundariesRule } from "./rules/feature-boundaries.ts";

const frontendPlugin = eslintCompatPlugin({
  meta: { name: "frontend" },
  rules: {
    "accessible-controls": accessibleControlsRule,
    "feature-boundaries": featureBoundariesRule,
  },
});

export default frontendPlugin;
