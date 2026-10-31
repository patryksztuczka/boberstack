import { tester } from "../../rule-tester.ts";
import { tryRequiresCatchRule } from "./try-requires-catch.ts";

const error = { messageId: "missingCatch" };

tester.run("effect/try-requires-catch", tryRequiresCatchRule, {
  valid: [
    'import { Effect } from "effect"; Effect.tryPromise({ try: () => client.query(sql), catch: () => new ReferenceSourceUnavailableError({}) });',
    "const Effect = { tryPromise: (f) => f }; Effect.tryPromise(() => fetch(url));",
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; Effect.tryPromise(() => client.query(sql));',
      errors: [error],
    },
    { code: 'import { Effect } from "effect"; Effect.try(() => parse(bytes));', errors: [error] },
    {
      code: 'import { Effect } from "effect"; Effect.tryPromise({ try: () => client.query(sql) });',
      errors: [error],
    },
  ],
});
