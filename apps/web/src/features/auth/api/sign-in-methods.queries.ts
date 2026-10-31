import { queryOptions, useQuery } from "@tanstack/react-query";

import { runPromise } from "../../../runtime.ts";
import { SignInMethodsClient } from "./sign-in-methods-client.ts";

export const signInMethodsQuery = queryOptions({
  queryKey: ["sign-in-methods"],
  queryFn: ({ signal }) =>
    runPromise(
      SignInMethodsClient.use((client) => client.list),
      signal,
    ),
  staleTime: Number.POSITIVE_INFINITY,
});

export const useSocialProviders = () => useQuery(signInMethodsQuery).data?.socialProviders ?? [];
