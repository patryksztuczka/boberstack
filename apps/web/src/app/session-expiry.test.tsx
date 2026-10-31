import { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryRouter } from "react-router";
import { describe, expect, it } from "vite-plus/test";

import { watchSessionExpiry } from "./session-expiry.ts";

const setup = () => {
  const router = createMemoryRouter(
    [
      { path: "todos", element: <p>todos</p> },
      { path: "sign-in", element: <p>sign in</p> },
    ],
    { initialEntries: ["/todos?x=1"] },
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  watchSessionExpiry(router, queryClient);

  return { router, queryClient };
};

describe("watchSessionExpiry", () => {
  it("sends the user to sign in when the API says the session is gone", async () => {
    const { router, queryClient } = setup();

    queryClient.setQueryData(["stale"], "cached");

    await queryClient
      .fetchQuery({ queryKey: ["todos"], queryFn: () => Promise.reject(new UnauthorizedError()) })
      .catch(() => undefined);

    expect(router.state.location.pathname).toBe("/sign-in");
    expect(router.state.location.search).toBe("?redirectTo=%2Ftodos%3Fx%3D1&expired=1");
    expect(queryClient.getQueryData(["stale"])).toBeUndefined();
  });

  it("leaves other failures to the page", async () => {
    const { router, queryClient } = setup();

    await queryClient
      .fetchQuery({ queryKey: ["todos"], queryFn: () => Promise.reject(new Error("offline")) })
      .catch(() => undefined);

    expect(router.state.location.pathname).toBe("/todos");
  });
});
