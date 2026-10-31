import { tester } from "../../../rule-tester.ts";
import { noTestTimeoutOrUnreasonedSkipRule } from "./no-test-timeout-or-unreasoned-skip.ts";

const filename = "apps/api/src/modules/todos/todo.service.test.ts";

const timeout = { messageId: "timeout" };

const skip = { messageId: "skip" };

const only = { messageId: "only" };

tester.run(
  "@boberstack/test-hygiene/no-test-timeout-or-unreasoned-skip",
  noTestTimeoutOrUnreasonedSkipRule,
  {
    valid: [
      { code: 'it.effect("lists todos", () => Effect.void);', filename },
      { code: 'describe.skipIf(isWindows)("paths", () => {});', filename },
      { code: 'it.runIf(hasDocker)("starts", () => {});', filename },
      { code: 'test("x", { skip: windowsHost }, () => {});', filename },
      {
        code: "await vi.waitFor(() => expect(spy).toHaveBeenCalled(), { timeout: 2000 });",
        filename,
      },
      { code: 'await screen.findByText("Saved", {}, { timeout: 2000 });', filename },
      { code: 'layer(PgTestLayer)((it) => { it.effect("x", () => Effect.void); });', filename },
      {
        code: '// QUARANTINE: #42 Hyperdrive in dev drops the connection after a restart\nit.skip("syncs todos", () => {});',
        filename,
      },
      {
        code: 'describe("todos", () => {\n  // QUARANTINE: waits for better-auth 1.8, which fixes the session cookie\n  it.todo("signs out everywhere");\n});',
        filename,
      },
      { code: 'it.skip("x", () => {});', filename: "apps/api/src/modules/todos/todo.service.ts" },
      { code: 'it("x", () => {}, 5000);', filename: "apps/api/vite.config.ts" },
    ],
    invalid: [
      { code: 'it.effect("x", () => Effect.void, 30_000);', filename, errors: [timeout] },
      { code: 'it("x", { timeout: 30_000 }, () => {});', filename, errors: [timeout] },
      { code: 'it("x", () => {}, { retry: 3 });', filename, errors: [timeout] },
      { code: 'describe("x", { timeout: 120_000 }, () => {});', filename, errors: [timeout] },
      {
        code: "layer(PgTestLayer, { timeout: 120_000 })((it) => {});",
        filename,
        errors: [timeout],
      },
      { code: 'it.each([1, 2])("x %i", (n) => {}, 10_000);', filename, errors: [timeout] },
      { code: "beforeAll(async () => {}, 60_000);", filename, errors: [timeout] },
      { code: "vi.setConfig({ testTimeout: 60_000 });", filename, errors: [timeout] },
      { code: 'it.skip("x", () => {});', filename, errors: [skip] },
      { code: 'describe.skip("x", () => {});', filename, errors: [skip] },
      { code: 'it.effect.skip("x", () => Effect.void);', filename, errors: [skip] },
      { code: 'test.todo("x");', filename, errors: [skip] },
      { code: 'xit("x", () => {});', filename, errors: [skip] },
      { code: 'it["skip"]("x", () => {});', filename, errors: [skip] },
      { code: 'test("x", { skip: true }, () => {});', filename, errors: [skip] },
      { code: '// TODO fix later\nit.skip("x", () => {});', filename, errors: [skip] },
      { code: '// QUARANTINE:\nit.skip("x", () => {});', filename, errors: [skip] },
      { code: 'it.only("x", () => {});', filename, errors: [only] },
      { code: 'describe.only("x", () => {});', filename, errors: [only] },
      { code: 'fit("x", () => {});', filename, errors: [only] },
      {
        code: '// QUARANTINE: still focused\nit.only("x", () => {});',
        filename,
        errors: [only],
      },
      {
        code: 'it("x", () => {}, 1000);',
        filename: "apps/web/src/features/todos/forms/new-todo-form.test.tsx",
        errors: [timeout],
      },
      {
        code: 'it("x", () => {}, 1000);',
        filename: "apps/api/src/platform/database/todo.repository.integration.test.ts",
        errors: [timeout],
      },
    ],
  },
);
