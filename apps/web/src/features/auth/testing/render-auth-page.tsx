import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import { SignInMethodsClient } from "@boberstack/client-runtime/identity";
import { TodosClient } from "@boberstack/client-runtime/todos";
import { SignInMethods } from "@boberstack/domain/identity/sign-in-methods";
import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { RegistryProvider } from "@effect/atom-react";
import { render } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { Atom } from "effect/reactivity";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { AuthGateway, AuthOutcome } from "../api/auth-client.ts";
import { AuthGatewayProvider } from "../api/auth-gateway-context.tsx";

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

const signInMethodsOffering = (providers: ReadonlyArray<SocialProvider>) =>
  Layer.mergeAll(
    Layer.succeed(
      SignInMethodsClient,
      SignInMethodsClient.of({
        list: Effect.succeed(
          new SignInMethods({ emailVerificationRequired: true, socialProviders: [...providers] }),
        ),
      }),
    ),
    Layer.mock(TodosClient, {}),
  );

export const renderAuthPage = (
  page: ReactElement,
  options: {
    readonly path: string;
    readonly gateway?: AuthGateway;
    readonly providers?: ReadonlyArray<SocialProvider>;
  },
) => {
  const router = createMemoryRouter(
    [
      { path: new URL(options.path, "http://test.invalid").pathname, element: page },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [options.path] },
  );

  render(
    <RegistryProvider
      initialValues={[
        Atom.initialValue(clientLayer, signInMethodsOffering(options.providers ?? [])),
      ]}
    >
      <AuthGatewayProvider gateway={options.gateway ?? fakeAuthGateway()}>
        <RouterProvider router={router} />
      </AuthGatewayProvider>
    </RegistryProvider>,
  );

  return router;
};
