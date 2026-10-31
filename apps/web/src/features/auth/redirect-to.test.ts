import { describe, expect, it } from "vite-plus/test";

import { safeRedirectTo, signInPath } from "./redirect-to.ts";

describe("safeRedirectTo", () => {
  it("keeps a same-origin path with its query and hash", () => {
    expect(safeRedirectTo("/todos?filter=open#top")).toBe("/todos?filter=open#top");
  });

  it("falls back to the todos page when there is no target", () => {
    expect(safeRedirectTo(null)).toBe("/todos");
    expect(safeRedirectTo(undefined)).toBe("/todos");
    expect(safeRedirectTo("")).toBe("/todos");
  });

  it("refuses targets that leave the app", () => {
    for (const target of [
      "https://evil.example/steal",
      "//evil.example/steal",
      "/\\evil.example",
      "javascript:alert(1)",
      "todos",
    ]) {
      expect(safeRedirectTo(target)).toBe("/todos");
    }
  });
});

describe("signInPath", () => {
  it("carries the page the user wanted", () => {
    expect(signInPath("/todos?x=1")).toBe("/sign-in?redirectTo=%2Ftodos%3Fx%3D1");
  });

  it("marks an expired session", () => {
    expect(signInPath("/todos", true)).toBe("/sign-in?redirectTo=%2Ftodos&expired=1");
  });
});
