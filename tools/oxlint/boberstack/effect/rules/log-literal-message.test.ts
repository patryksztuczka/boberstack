import { tester } from "../../../rule-tester.ts";
import { logLiteralMessageRule } from "./log-literal-message.ts";

const error = { messageId: "dynamicMessage" };

tester.run("@boberstack/effect/log-literal-message", logLiteralMessageRule, {
  valid: [
    'import { Effect } from "effect"; Effect.logInfo("Todo completed", { todoId, listId });',
    'import { Effect } from "effect"; Effect.logWarning(`Reference source unavailable`);',
    'import { Effect } from "effect"; Effect.log();',
    "const Effect = { logInfo: (m) => m }; Effect.logInfo(message);",
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; Effect.logInfo("Completed todo for " + todoId);',
      errors: [error],
    },
    { code: 'import { Effect } from "effect"; Effect.logWarning(errorMessage);', errors: [error] },
    {
      code: 'import { Effect } from "effect"; Effect.logError(`Failed for ${todoId}`);',
      errors: [error],
    },
  ],
});
