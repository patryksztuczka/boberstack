import { tester } from "../../../rule-tester.ts";
import { noAmbientDateRule } from "./no-ambient-date.ts";

const error = { messageId: "ambientDate" };

tester.run("@boberstack/effect/no-ambient-date", noAmbientDateRule, {
  valid: [
    "const parsed = new Date(row.startedAt);",
    "const utc = Date.UTC(2026, 0, 1);",
    "class Date {} const local = new Date();",
  ],
  invalid: [
    { code: "const startedAt = new Date();", errors: [error] },
    { code: "const label = Date();", errors: [error] },
  ],
});
