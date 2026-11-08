import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { newTodoFrom } from "./new-todo.schema.ts";

describe("newTodoFrom", () => {
  it("trims the title", () => {
    expect(Option.map(newTodoFrom("  Buy milk "), (todo) => todo.title)).toStrictEqual(
      Option.some("Buy milk"),
    );
  });

  it("refuses an empty or too long title", () => {
    expect(Option.isNone(newTodoFrom("   "))).toBe(true);
    expect(Option.isNone(newTodoFrom("x".repeat(201)))).toBe(true);
  });
});
