import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { noCommentsRule } from "./rules/no-comments.ts";

const noCommentsPlugin = eslintCompatPlugin({
  meta: { name: "no-comments" },
  rules: {
    "no-comments": noCommentsRule,
  },
});

export default noCommentsPlugin;
