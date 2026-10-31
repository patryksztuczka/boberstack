import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { noPollingLoopInTestsRule } from "./rules/no-polling-loop-in-tests.ts";
import { noRealTimeWaitInTestsRule } from "./rules/no-real-time-wait-in-tests.ts";
import { noTestTimeoutOrUnreasonedSkipRule } from "./rules/no-test-timeout-or-unreasoned-skip.ts";

const testHygienePlugin = eslintCompatPlugin({
  meta: { name: "test-hygiene" },
  rules: {
    "no-polling-loop-in-tests": noPollingLoopInTestsRule,
    "no-real-time-wait-in-tests": noRealTimeWaitInTestsRule,
    "no-test-timeout-or-unreasoned-skip": noTestTimeoutOrUnreasonedSkipRule,
  },
});

export default testHygienePlugin;
