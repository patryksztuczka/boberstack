import { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import type { QueryClient } from "@tanstack/react-query";
import { Schema } from "effect";

const isUnauthorized = Schema.is(UnauthorizedError);

export const watchSessionExpiry = (queryClient: QueryClient, expire: () => Promise<void>) => {
  const onError = (error: Error | null) => {
    if (!isUnauthorized(error)) return;

    queryClient.clear();
    void expire();
  };

  const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "error") onError(event.action.error);
  });

  const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "error") onError(event.action.error);
  });

  return () => {
    unsubscribeQueries();
    unsubscribeMutations();
  };
};
