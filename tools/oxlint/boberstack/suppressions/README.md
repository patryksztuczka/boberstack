# suppressions

Oxlint JS plugin with one rule, `@boberstack/suppressions/require-suppression-reason`, on everywhere. A suppression is allowed, but it has to say what it turns off and why:

```ts
// oxlint-disable-next-line typescript/no-explicit-any -- the generated client types this as any
const body = response.body;

// @ts-expect-error the test passes a wrong argument on purpose
create(42);
```

| Comment                                                     | Needs                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `oxlint-disable`, `-next-line`, `-line` (and `eslint-` too) | at least one rule name, then ` -- <reason>`                                 |
| `@ts-expect-error`                                          | a reason after it (`--` optional)                                           |
| `@effect-diagnostics`, `@effect-diagnostics-next-line`      | at least one `<rule>:off`, then ` -- <reason>`                              |
| `@ts-ignore`, `@ts-nocheck`                                 | banned: use `@ts-expect-error <reason>`, which fails once the error is gone |

Two more checks back the rule up:

- `reportUnusedDisableDirectives: "error"` in [`../lint.config.ts`](../lint.config.ts): a disable that no longer suppresses anything fails lint, so it cannot outlive the code it was for.
- `pnpm check:suppressions` ([`scripts/suppressions.mjs`](../../../scripts/suppressions.mjs)) counts suppressions per rule and compares them with [`suppressions.baseline.json`](../../../suppressions.baseline.json). Growth prints a warning (and a GitHub annotation in CI) but never fails: a new suppression is a decision for the reviewer, not for the tool. After a deliberate change, run `pnpm check:suppressions --update` and commit the baseline with it. When the count drops, the script asks for `--update` so the lower number becomes the new ceiling.

Before adding a suppression, try the fix the lint message names. If the rule is wrong for a whole kind of file, change its options in `lint.config.ts` (owner sign-off, see `AGENTS.md`) instead of disabling it line by line.
