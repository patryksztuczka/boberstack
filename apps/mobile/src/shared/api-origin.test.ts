import { Option, Result } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { apiOriginFrom } from "./api-origin.ts";

describe("apiOriginFrom", () => {
  it("keeps an http or https origin", () => {
    expect(apiOriginFrom("http://localhost:5173")).toStrictEqual(
      Result.succeed("http://localhost:5173"),
    );
    expect(apiOriginFrom(" https://app.example.com/ ")).toStrictEqual(
      Result.succeed("https://app.example.com"),
    );
  });

  it("refuses a missing value and names the variable", () => {
    for (const value of [undefined, "", "   "]) {
      expect(Result.getFailure(apiOriginFrom(value))).toStrictEqual(
        Option.some(expect.stringContaining("EXPO_PUBLIC_API_URL is not set")),
      );
    }
  });

  it("refuses a value that is not an origin", () => {
    for (const value of ["localhost:5173", "ftp://example.com", "https://app.example.com/api"]) {
      expect(Result.isFailure(apiOriginFrom(value))).toBe(true);
    }
  });
});
