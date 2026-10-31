import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ basePath: "/api/auth" });

export type AuthOutcome =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: string | undefined;
      readonly message: string;
    };

export interface AuthGateway {
  readonly isSignedIn: () => Promise<boolean>;
  readonly signInEmail: (
    email: string,
    password: string,
    callbackURL: string,
  ) => Promise<AuthOutcome>;
  readonly signUpEmail: (
    name: string,
    email: string,
    password: string,
    callbackURL: string,
  ) => Promise<AuthOutcome>;
  readonly signInSocial: (provider: SocialProvider, callbackURL: string) => Promise<AuthOutcome>;
  readonly sendVerificationEmail: (email: string, callbackURL: string) => Promise<AuthOutcome>;
  readonly requestPasswordReset: (email: string, redirectTo: string) => Promise<AuthOutcome>;
  readonly resetPassword: (newPassword: string, token: string) => Promise<AuthOutcome>;
}

interface BetterAuthError {
  readonly status: number;
  readonly statusText: string;
  readonly code?: string | undefined;
  readonly message?: string | undefined;
}

const outcome = (result: { readonly error: BetterAuthError | null }): AuthOutcome =>
  result.error === null
    ? { ok: true }
    : {
        ok: false,
        status: result.error.status,
        code: result.error.code,
        message: result.error.message ?? result.error.statusText,
      };

export const betterAuthGateway: AuthGateway = {
  isSignedIn: async () => (await authClient.getSession()).data !== null,
  signInEmail: async (email, password, callbackURL) =>
    outcome(await authClient.signIn.email({ email, password, callbackURL })),
  signUpEmail: async (name, email, password, callbackURL) =>
    outcome(await authClient.signUp.email({ name, email, password, callbackURL })),
  signInSocial: async (provider, callbackURL) =>
    outcome(await authClient.signIn.social({ provider, callbackURL })),
  sendVerificationEmail: async (email, callbackURL) =>
    outcome(await authClient.sendVerificationEmail({ email, callbackURL })),
  requestPasswordReset: async (email, redirectTo) =>
    outcome(await authClient.requestPasswordReset({ email, redirectTo })),
  resetPassword: async (newPassword, token) =>
    outcome(await authClient.resetPassword({ newPassword, token })),
};
