import { describe, expect, it } from "vite-plus/test";

import { withSessionCookie } from "./session-fetch.ts";
import type { Fetch } from "./session-fetch.ts";

interface SentRequest {
  readonly input: Parameters<Fetch>[0];
  readonly cookie: string | null;
  readonly accept: string | null;
  readonly credentials: RequestInit["credentials"];
}

const recordingFetch =
  (sent: Array<SentRequest>): Fetch =>
  async (input, init) => {
    const headers = new Headers(init?.headers);

    sent.push({
      input,
      cookie: headers.get("cookie"),
      accept: headers.get("accept"),
      credentials: init?.credentials,
    });

    return new Response("[]", { status: 200 });
  };

describe("withSessionCookie", () => {
  it("sends the stored session cookie and never the platform's cookies", async () => {
    const sent: Array<SentRequest> = [];

    const fetch = withSessionCookie(
      recordingFetch(sent),
      async () => "better-auth.session_token=abc",
    );

    await fetch("http://api.test/api/todos", {
      headers: { accept: "application/json" },
      credentials: "include",
    });

    expect(sent).toStrictEqual([
      {
        input: "http://api.test/api/todos",
        cookie: "better-auth.session_token=abc",
        accept: "application/json",
        credentials: "omit",
      },
    ]);
  });

  it("reads the cookie again for every request", async () => {
    const sent: Array<SentRequest> = [];
    const cookies = ["better-auth.session_token=first", "better-auth.session_token=second"];
    const fetch = withSessionCookie(recordingFetch(sent), async () => cookies.shift() ?? "");

    await fetch("http://api.test/api/todos");
    await fetch("http://api.test/api/todos");

    expect(sent.map((request) => request.cookie)).toStrictEqual([
      "better-auth.session_token=first",
      "better-auth.session_token=second",
    ]);
  });

  it("sends no cookie header when signed out", async () => {
    const sent: Array<SentRequest> = [];
    const fetch = withSessionCookie(recordingFetch(sent), async () => "");

    await fetch("http://api.test/api/todos", { headers: { cookie: "stale=1" } });

    expect(sent.map((request) => request.cookie)).toStrictEqual([null]);
  });
});
