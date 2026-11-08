import { describe, expect, it } from "@effect/vitest";

import { NavigationVerdict, navigationVerdict } from "./navigation.ts";

const app = new URL("https://app.example.com/");

describe("navigationVerdict", () => {
  it("stays on a page of the app", () => {
    expect(navigationVerdict(app, "https://app.example.com/todos?x=1")).toEqual(
      NavigationVerdict.cases.Stay.make({}),
    );
  });

  it("sends other http and https pages to the system browser", () => {
    expect(navigationVerdict(app, "https://github.com/login/oauth")).toEqual(
      NavigationVerdict.cases.OpenExternal.make({ url: new URL("https://github.com/login/oauth") }),
    );
    expect(navigationVerdict(app, "http://app.example.com/")).toEqual(
      NavigationVerdict.cases.OpenExternal.make({ url: new URL("http://app.example.com/") }),
    );
  });

  it("blocks every other scheme and what does not parse", () => {
    for (const url of ["file:///etc/passwd", "javascript:alert(1)", "mailto:a@b.c", "not a url"]) {
      expect(navigationVerdict(app, url)).toEqual(NavigationVerdict.cases.Block.make({}));
    }
  });
});
