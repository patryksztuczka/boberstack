import { describe, expect, it } from "@effect/vitest";

import {
  appUrl,
  RendererSource,
  Resolution,
  resolveBundleRequest,
  withAppOrigin,
} from "./renderer-source.ts";

const bundle = RendererSource.cases.Bundle.make({
  directory: "/app/web/dist",
  origin: new URL("https://app.example.com"),
});

const resolve = (url: string) => resolveBundleRequest(bundle, new URL(url));

const file = (relativePath: string) =>
  Resolution.cases.File.make({ directory: "/app/web/dist", relativePath });

describe("appUrl", () => {
  it("opens the dev server as it is", () => {
    const devServer = RendererSource.cases.DevServer.make({
      url: new URL("http://localhost:5173"),
    });

    expect(appUrl(devServer).href).toBe("http://localhost:5173/");
  });

  it("opens the root of the app's origin for the bundle", () => {
    expect(appUrl(bundle).href).toBe("https://app.example.com/");
  });
});

describe("resolveBundleRequest", () => {
  it("sends /api and everything under it to the app's api", () => {
    expect(resolve("https://app.example.com/api/todos?limit=5")).toEqual(
      Resolution.cases.Api.make({}),
    );
    expect(resolve("https://app.example.com/api")).toEqual(Resolution.cases.Api.make({}));
  });

  it("sends another host or scheme to the network", () => {
    for (const url of ["https://fonts.example.com/a.woff2", "http://app.example.com/assets/a.js"]) {
      expect(resolve(url)).toEqual(Resolution.cases.Network.make({}));
    }
  });

  it("serves a path that only starts with api from the bundle", () => {
    expect(resolve("https://app.example.com/apiary.png")).toEqual(file("apiary.png"));
  });

  it("serves an asset by its decoded path", () => {
    expect(resolve("https://app.example.com/assets/index%20a.js")).toEqual(
      file("assets/index a.js"),
    );
  });

  it("falls back to index.html for the root and for a route without an extension", () => {
    for (const url of [
      "https://app.example.com/",
      "https://app.example.com/todos/42",
      "https://app.example.com/sign-in?x=1",
    ]) {
      expect(resolve(url)).toEqual(file("index.html"));
    }
  });

  it("refuses an encoded climb out of the bundle", () => {
    for (const url of [
      "https://app.example.com/assets/..%2F..%2Fsecret.txt",
      "https://app.example.com/%2e%2e%5csecret.txt",
      "https://app.example.com/assets/%00.js",
    ]) {
      expect(resolve(url)).toEqual(Resolution.cases.NotFound.make({}));
    }
  });

  it("refuses a malformed percent sequence", () => {
    expect(resolve("https://app.example.com/assets/%E0%A4%A.js")).toEqual(
      Resolution.cases.NotFound.make({}),
    );
  });
});

describe("withAppOrigin", () => {
  const origin = new URL("https://app.example.com/");

  it("adds the app's origin to a request that has none", () => {
    expect(withAppOrigin(new Headers({ accept: "application/json" }), origin).get("origin")).toBe(
      "https://app.example.com",
    );
  });

  it("keeps an origin the request already has", () => {
    expect(
      withAppOrigin(new Headers({ origin: "https://other.example.com" }), origin).get("origin"),
    ).toBe("https://other.example.com");
  });
});
