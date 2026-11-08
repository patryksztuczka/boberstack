import { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import { watchSessionExpiry } from "./session-expiry.ts";

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const expired: Array<true> = [];

  watchSessionExpiry(queryClient, async () => {
    expired.push(true);
  });

  return { queryClient, expired };
};

describe("watchSessionExpiry", () => {
  it("ends the session and drops cached data when the api refuses it", async () => {
    const { queryClient, expired } = setup();

    queryClient.setQueryData(["stale"], "cached");

    await queryClient
      .fetchQuery({ queryKey: ["todos"], queryFn: () => Promise.reject(new UnauthorizedError()) })
      .catch(() => undefined);

    expect(expired).toStrictEqual([true]);
    expect(queryClient.getQueryData(["stale"])).toBeUndefined();
  });

  it("ends the session when a mutation is refused", async () => {
    const { queryClient, expired } = setup();

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(new UnauthorizedError()) })
      .execute(undefined)
      .catch(() => undefined);

    expect(expired).toStrictEqual([true]);
  });

  it("leaves other failures to the screen", async () => {
    const { queryClient, expired } = setup();

    queryClient.setQueryData(["stale"], "cached");

    await queryClient
      .fetchQuery({ queryKey: ["todos"], queryFn: () => Promise.reject(new Error("offline")) })
      .catch(() => undefined);

    expect(expired).toStrictEqual([]);
    expect(queryClient.getQueryData(["stale"])).toBe("cached");
  });
});
