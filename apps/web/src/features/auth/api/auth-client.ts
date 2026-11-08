import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { createAuthClient } from "better-auth/react";

const client = createAuthClient({
  basePath: "/api/auth",
  disableDefaultFetchPlugins: true,
  plugins: [oauthProviderClient()],
});

export const authClient = { useSession: client.useSession, signOut: client.signOut };

interface AuthFailure {
  readonly ok: false;
  readonly status: number;
  readonly code: string | undefined;
  readonly message: string;
}

export type AuthOutcome = { readonly ok: true } | AuthFailure;

export type RedirectOutcome = { readonly ok: true; readonly url: string | undefined } | AuthFailure;

export interface AuthGateway {
  readonly isSignedIn: () => Promise<boolean>;
  readonly signInEmail: (
    email: string,
    password: string,
    callbackURL: string,
  ) => Promise<RedirectOutcome>;
  readonly signUpEmail: (
    name: string,
    email: string,
    password: string,
    callbackURL: string,
  ) => Promise<AuthOutcome>;
  readonly signInSocial: (
    provider: SocialProvider,
    callbackURL: string,
  ) => Promise<RedirectOutcome>;
  readonly sendVerificationEmail: (email: string, callbackURL: string) => Promise<AuthOutcome>;
  readonly requestPasswordReset: (email: string, redirectTo: string) => Promise<AuthOutcome>;
  readonly resetPassword: (newPassword: string, token: string) => Promise<AuthOutcome>;
  readonly mcpClientName: (clientId: string) => Promise<string | undefined>;
  readonly answerConsent: (allow: boolean) => Promise<RedirectOutcome>;
  readonly followRedirect: (url: string) => void;
}

interface BetterAuthError {
  readonly status: number;
  readonly statusText: string;
  readonly code?: string | undefined;
  readonly message?: string | undefined;
  readonly error?: string | undefined;
  readonly error_description?: string | undefined;
}

interface Redirect {
  readonly redirect?: boolean | undefined;
  readonly url?: string | undefined;
}

const failure = (error: BetterAuthError): AuthFailure => ({
  ok: false,
  status: error.status,
  code: error.code ?? error.error,
  message: error.message ?? error.error_description ?? error.statusText,
});

const outcome = (result: { readonly error: BetterAuthError | null }): AuthOutcome =>
  result.error === null ? { ok: true } : failure(result.error);

const redirectOutcome = (result: {
  readonly data: Redirect | null;
  readonly error: BetterAuthError | null;
}): RedirectOutcome =>
  result.error === null
    ? { ok: true, url: result.data?.redirect === true ? result.data.url : undefined }
    : failure(result.error);

const UNSAFE_SCHEMES = new Set(["javascript:", "data:", "vbscript:"]);

const followRedirect = (url: string) => {
  const target = URL.parse(url, globalThis.location.href);

  if (target === null || UNSAFE_SCHEMES.has(target.protocol)) return;

  globalThis.location.assign(target.href);
};

export const betterAuthGateway: AuthGateway = {
  isSignedIn: async () => (await client.getSession()).data !== null,
  signInEmail: async (email, password, callbackURL) =>
    redirectOutcome(await client.signIn.email({ email, password, callbackURL })),
  signUpEmail: async (name, email, password, callbackURL) =>
    outcome(await client.signUp.email({ name, email, password, callbackURL })),
  signInSocial: async (provider, callbackURL) =>
    redirectOutcome(await client.signIn.social({ provider, callbackURL })),
  sendVerificationEmail: async (email, callbackURL) =>
    outcome(await client.sendVerificationEmail({ email, callbackURL })),
  requestPasswordReset: async (email, redirectTo) =>
    outcome(await client.requestPasswordReset({ email, redirectTo })),
  resetPassword: async (newPassword, token) =>
    outcome(await client.resetPassword({ newPassword, token })),
  mcpClientName: async (clientId) => {
    const result = await client.oauth2.publicClient({ query: { client_id: clientId } });

    return result.data?.client_name ?? undefined;
  },
  answerConsent: async (allow) => redirectOutcome(await client.oauth2.consent({ accept: allow })),
  followRedirect,
};
