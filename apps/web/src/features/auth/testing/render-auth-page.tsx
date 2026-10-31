import { SignInMethods } from "@boberstack/domain/identity/sign-in-methods";
import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { AuthGateway, AuthOutcome } from "../api/auth-client.ts";
import { AuthGatewayProvider } from "../api/auth-gateway-context.tsx";
import { signInMethodsQuery } from "../api/sign-in-methods.queries.ts";

const ok = (): Promise<AuthOutcome> => Promise.resolve({ ok: true });

export const fakeAuthGateway = (overrides: Partial<AuthGateway> = {}): AuthGateway => ({
  isSignedIn: () => Promise.resolve(false),
  signInEmail: ok,
  signUpEmail: ok,
  signInSocial: ok,
  sendVerificationEmail: ok,
  requestPasswordReset: ok,
  resetPassword: ok,
  ...overrides,
});

export const renderAuthPage = (
  page: ReactElement,
  options: {
    readonly path: string;
    readonly gateway?: AuthGateway;
    readonly providers?: ReadonlyArray<SocialProvider>;
  },
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  queryClient.setQueryData(
    signInMethodsQuery.queryKey,
    new SignInMethods({
      emailVerificationRequired: true,
      socialProviders: [...(options.providers ?? [])],
    }),
  );

  const router = createMemoryRouter(
    [
      { path: new URL(options.path, "http://test.invalid").pathname, element: page },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [options.path] },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <AuthGatewayProvider gateway={options.gateway ?? fakeAuthGateway()}>
        <RouterProvider router={router} />
      </AuthGatewayProvider>
    </QueryClientProvider>,
  );

  return router;
};
