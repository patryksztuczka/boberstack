import { tester } from "../../rule-tester.ts";
import { noRealTimeWaitInTestsRule } from "./no-real-time-wait-in-tests.ts";

const filename = "apps/api/src/modules/todos/todo.service.test.ts";

const realClock = { messageId: "realClock" };

const undriven = { messageId: "undriven" };

tester.run("test-hygiene/no-real-time-wait-in-tests", noRealTimeWaitInTestsRule, {
  valid: [
    {
      code: 'it.effect("expires", () => Effect.gen(function* () {\n  const fiber = yield* Effect.fork(Effect.sleep("1 hour"));\n  yield* TestClock.adjust("1 hour");\n  yield* Fiber.join(fiber);\n}));',
      filename,
    },
    {
      code: 'it.effect("retries", () => Effect.gen(function* () {\n  yield* TestClock.adjust("1 second");\n  return yield* task.pipe(Effect.retry(Schedule.spaced("1 second")));\n}));',
      filename,
    },
    {
      code: 'it("shows the error", async () => {\n  await userEvent.click(button);\n  expect(await screen.findByText("Required")).toBeVisible();\n});',
      filename,
    },
    { code: "await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));", filename },
    { code: "setTimeout(flush, 10);", filename: "apps/web/src/runtime.ts" },
    { code: "const timer = clock.setTimeout;", filename },
  ],
  invalid: [
    {
      code: 'it("waits", async () => {\n  await new Promise((resolve) => setTimeout(resolve, 50));\n});',
      filename,
      errors: [realClock],
    },
    { code: "setInterval(poll, 100);", filename, errors: [realClock] },
    { code: "globalThis.setTimeout(done, 0);", filename, errors: [realClock] },
    {
      code: 'import { setTimeout as wait } from "node:timers/promises";\nit("x", async () => { await wait(100); });',
      filename,
      errors: [realClock],
    },
    {
      code: 'import * as timers from "node:timers/promises";\nit("x", async () => { await timers.setTimeout(100); });',
      filename,
      errors: [realClock],
    },
    { code: 'it("x", async () => { await sleep(100); });', filename, errors: [realClock] },
    {
      code: 'it.live("x", () => Effect.sleep("100 millis"));',
      filename,
      errors: [realClock],
    },
    {
      code: 'it("x", () => Effect.runPromise(Effect.sleep("1 second")));',
      filename,
      errors: [realClock],
    },
    {
      code: 'it.effect("x", () => Effect.gen(function* () {\n  yield* Effect.sleep("1 second");\n}));',
      filename,
      errors: [undriven],
    },
    {
      code: 'const settle = Effect.sleep("50 millis");\nit.live("x", () => settle);',
      filename,
      errors: [realClock],
    },
    {
      code: 'layer(Live, { excludeTestServices: true })((it) => {\n  it.effect("x", () => Effect.sleep("1 second"));\n});',
      filename,
      errors: [realClock],
    },
  ],
});
