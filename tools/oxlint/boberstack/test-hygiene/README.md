# test-hygiene

Oxlint JS plugin (`@boberstack/test-hygiene/<rule>`) against the two ways a red test is turned green without fixing anything: giving it more time and switching it off. The rules run on test files only (`*.test.ts`, `*.test.tsx`, `*.integration.test.ts`); config files such as a package's `vite.config.ts` keep their timeouts, which are the ceiling for every test.

The house rules they enforce are in [`.agents/skills/effect-best-practices/references/11-testing.md`](../../../.agents/skills/effect-best-practices/references/11-testing.md) (`test.flaky`). Vitest backs them up: every package's `vite.config.ts` sets `retry: 0`, `passWithNoTests: false` and `allowOnly: !process.env.CI`.

| Rule                                 | Flags                                                                                                                                                                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-test-timeout-or-unreasoned-skip` | a timeout, `retry` or `repeats` passed to `it` / `test` / `describe` / `suite` / `layer` (number or options), hook timeouts, `vi.setConfig` timeouts; `.skip`, `.todo`, `xit` and `{ skip: true }` without `// QUARANTINE: <reason>` on the line above; `.only` and `fit` always |
| `no-real-time-wait-in-tests`         | `setTimeout` / `setInterval` / `setImmediate`, `node:timers/promises`, `sleep(…)` / `delay(…)` helpers; `Effect.sleep`, `Effect.delay` and `Schedule.spaced` outside the TestClock; `Effect.sleep` under `it.effect` in a file that never calls `TestClock.adjust`               |
| `no-polling-loop-in-tests`           | a loop that waits a tick or a sleep per turn until a predicate holds                                                                                                                                                                                                             |

Allowed: `vi.waitFor`, `expect.poll`, Testing Library's `findBy*` and `waitFor` (they poll with a deadline and say what they wait for), `describe.skipIf` / `it.runIf` (a platform gate), `it.effect` with `TestClock.adjust`, and fixed-count loops (`for (let i = 0; i < 3; i++)`).

A quarantined test looks like this:

```ts
// QUARANTINE: #42 Hyperdrive in dev drops the connection after a restart; back once Alchemy beta.90 lands
it.skip("syncs todos", () => {});
```

Ported from the `t3code/no-test-timeout-or-unreasoned-skip`, `t3code/no-real-time-wait-in-tests` and `t3code/no-polling-loop-in-tests` rules of [pingdotgg/t3code](https://github.com/pingdotgg/t3code/tree/main/oxlint-plugin-t3code) (MIT). Differences: the quarantine marker is `QUARANTINE:` with any reason (an issue number is recommended, not required) so it matches this repo's `VENDOR:` / `SAFETY:` / `BRIDGE:` markers; `.only` cannot be quarantined; every timer call in a test file is flagged, not only timers inside a `new Promise`; `sleep` / `delay` helpers count as waits; there is no `.live.test.ts` exemption.
