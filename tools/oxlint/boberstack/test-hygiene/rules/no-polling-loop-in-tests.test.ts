import { tester } from "../../../rule-tester.ts";
import { noPollingLoopInTestsRule } from "./no-polling-loop-in-tests.ts";

const filename = "apps/api/src/modules/todos/todo.service.test.ts";

const polling = { messageId: "polling" };

tester.run("@boberstack/test-hygiene/no-polling-loop-in-tests", noPollingLoopInTestsRule, {
  valid: [
    { code: "for (let i = 0; i < 3; i++) { yield* Effect.yieldNow; }", filename },
    { code: "for (const todo of todos) { await store.insert(todo); }", filename },
    { code: "while (queue.length > 0) { handle(queue.shift()); }", filename },
    { code: "await vi.waitFor(() => expect(spy).toHaveBeenCalled());", filename },
    {
      code: "while (!done) { await sleep(10); }",
      filename: "apps/api/src/modules/todos/todo.service.ts",
    },
  ],
  invalid: [
    { code: "while (!done) { await sleep(10); }", filename, errors: [polling] },
    {
      code: "while (true) {\n  if (events.length > 0) break;\n  yield* Effect.yieldNow;\n}",
      filename,
      errors: [polling],
    },
    {
      code: "for (;;) {\n  if (store.size === 2) return;\n  await new Promise((resolve) => setTimeout(resolve, 5));\n}",
      filename,
      errors: [polling],
    },
    {
      code: 'do { yield* Effect.sleep("10 millis"); } while (status !== "ready");',
      filename,
      errors: [polling],
    },
    {
      code: "while (events.length < 1) { await Promise.resolve(); }",
      filename,
      errors: [polling],
    },
    {
      code: "while (pending) { yield* Effect.promise(() => Promise.resolve()); }",
      filename,
      errors: [polling],
    },
  ],
});
