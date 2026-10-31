import { tester } from "../../rule-tester.ts";
import { retryRequiresWhileRule } from "./retry-requires-while.ts";

const error = { messageId: "missingWhile" };

tester.run("effect/retry-requires-while", retryRequiresWhileRule, {
  valid: [
    'import { Effect, Predicate, Schedule } from "effect"; eff.pipe(Effect.retry({ schedule: Schedule.exponential("100 millis"), times: 3, while: Predicate.isTagged("ReferenceSourceUnavailableError") }));',
    'import { Effect as E } from "effect"; eff.pipe(E.retry({ until: isFatal }));',
    "const Effect = { retry() {} }; Effect.retry({ times: 3 });",
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; eff.pipe(Effect.retry({ times: 5 }));',
      errors: [error],
    },
    {
      code: 'import { Effect, Schedule } from "effect"; eff.pipe(Effect.retry(Schedule.recurs(3)));',
      errors: [error],
    },
    {
      code: 'import * as Effect from "effect/Effect"; eff.pipe(Effect.retry({ times: 1 }));',
      errors: [error],
    },
    {
      code: 'import { Effect } from "effect"; Effect.retryOrElse(eff, policy, fallback);',
      errors: [error],
    },
  ],
});
