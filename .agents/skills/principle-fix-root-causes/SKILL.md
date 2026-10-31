---
name: principle-fix-root-causes
description: Apply when debugging or fixing a bug. Trace the symptom back to the first place the system did something wrong and fix it there. A guard, retry or catch is a fix only when the state it handles is legitimate.
disable-model-invocation: true
---

# Fix root causes

The symptom is where a wrong state became visible. The root cause is the first place the code made a wrong decision, or failed to handle a state it should handle. Fix that place. A fix at the symptom hides the evidence and leaves the fault free to surface somewhere else.

## How

1. Reproduce first, on the surface where the bug shows: the app through the `verify-web` skill, the CLI through `pnpm cli`, the api with a request. A unit test proves a branch, not that the bug is gone.
2. Ask "why" at each step until the answer is a wrong decision in the code, not a consequence of an earlier one.
3. When stuck, look at the real state: the span and log fields (`obs.logs`), the row in Postgres, the decoded value. Do not guess.
4. Decide whether the state that triggered the symptom is legitimate.
   - It is: the code that broke on it is the root cause, and handling the state there is the fix.
   - It is not: find what produced it. A check where it broke only hides the bug.
5. Look for the pattern, not the instance. Fix every place with the same fault in the same change.

## What hides a bug

`Effect.catch` that turns a failure into a default value, `Effect.retry` on an error that is not transient (`retry.while`), `Option.getOrElse` on something that should always exist, a clamped number, a swallowed decode error, an `orElse` back to an empty list. Each one is a fix only when the state is legitimate and the fallback is a valid domain answer (`errors.context`).

When a fix needs a paragraph to justify it, the code is wrong. When the deciding fact took a long dig to find, add the log field or span attribute that would have shown it at first look.

Two fixes on the same premise that both failed: stop and use the `principle-attack-the-premise` skill.
