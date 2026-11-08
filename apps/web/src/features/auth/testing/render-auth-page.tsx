import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import {
  McpClientDirectory,
  McpClientProfile,
  SignInMethodsClient,
} from "@boberstack/client-runtime/identity";
import type { McpClientDirectoryApi } from "@boberstack/client-runtime/identity";
import { TodosClient } from "@boberstack/client-runtime/todos";
import { SignInMethods } from "@boberstack/domain/identity/sign-in-methods";
import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { RegistryProvider } from "@effect/atom-react";
import { render } from "@testing-library/react";
import { Effect, Layer, Option } from "effect";
import { Atom } from "effect/reactivity";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { AuthGateway, AuthOutcome, RedirectOutcome } from "../api/auth-client.ts";
import { AuthGatewayProvider } from "../api/auth-gateway-context.tsx";

const ok = (): Promise<AuthOutcome> => Promise.resolve({ ok: true });

const stay = (): Promise<RedirectOutcome> => Promise.resolve({ ok: true, url: undefined });

export const fakeAuthGateway = (overrides: Partial<AuthGateway> = {}): AuthGateway => ({
  isSignedIn: () => Promise.resolve(false),
  signInEmail: stay,
  signUpEmail: ok,
  signInSocial: stay,
  sendVerificationEmail: ok,
  requestPasswordReset: ok,
  resetPassword: ok,
  answerConsent: stay,
  followRedirect: () => undefined,
  ...overrides,
});

export const unnamedMcpClient: McpClientDirectoryApi["profileOf"] = (clientId) =>
  Effect.succeed(new McpClientProfile({ clientId, name: Option.none() }));

const clientsFor = (
  providers: ReadonlyArray<SocialProvider>,
  profileOf: McpClientDirectoryApi["profileOf"],
) =>
  Layer.mergeAll(
    Layer.succeed(McpClientDirectory, McpClientDirectory.of({ profileOf })),
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
    readonly mcpClients?: McpClientDirectoryApi["profileOf"];
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
        Atom.initialValue(
          clientLayer,
          clientsFor(options.providers ?? [], options.mcpClients ?? unnamedMcpClient),
        ),
      ]}
    >
      <AuthGatewayProvider gateway={options.gateway ?? fakeAuthGateway()}>
        <RouterProvider router={router} />
      </AuthGatewayProvider>
    </RegistryProvider>,
  );

  return router;
};
