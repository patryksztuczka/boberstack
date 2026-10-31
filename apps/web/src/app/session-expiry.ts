import { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import type { QueryClient } from "@tanstack/react-query";
import { Schema } from "effect";
import type { DataRouter } from "react-router";

import { signInPath } from "../features/auth/index.ts";

const isUnauthorized = Schema.is(UnauthorizedError);

export const watchSessionExpiry = (router: DataRouter, queryClient: QueryClient) => {
  const expire = (error: Error | null) => {
    const { pathname, search } = router.state.location;

    if (!isUnauthorized(error) || pathname === "/sign-in") return;

    queryClient.clear();
    void router.navigate(signInPath(`${pathname}${search}`, true));
  };

  const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "error") expire(event.action.error);
  });

  const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "error") expire(event.action.error);
  });

  return () => {
    unsubscribeQueries();
    unsubscribeMutations();
  };
};
