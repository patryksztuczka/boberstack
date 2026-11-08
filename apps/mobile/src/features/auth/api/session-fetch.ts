export type Fetch = typeof globalThis.fetch;

export const withSessionCookie =
  (fetch: Fetch, sessionCookie: () => Promise<string>): Fetch =>
  async (input, init) => {
    const cookie = await sessionCookie();
    const headers = new Headers(init?.headers);

    if (cookie === "") {
      headers.delete("cookie");
    } else {
      headers.set("cookie", cookie);
    }

    return fetch(input, { ...init, headers, credentials: "omit" });
  };
