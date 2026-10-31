import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { requireSuppressionReasonRule } from "./rules/require-suppression-reason.ts";

const suppressionsPlugin = eslintCompatPlugin({
  meta: { name: "suppressions" },
  rules: {
    "require-suppression-reason": requireSuppressionReasonRule,
  },
});

export default suppressionsPlugin;
