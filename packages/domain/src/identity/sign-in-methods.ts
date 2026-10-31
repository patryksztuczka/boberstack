import { Schema } from "effect";

export const SocialProvider = Schema.Literals(["github", "google"]);

export type SocialProvider = typeof SocialProvider.Type;

export class SignInMethods extends Schema.Class<SignInMethods, { readonly brand: unique symbol }>(
  "SignInMethods",
)({
  emailVerificationRequired: Schema.Boolean,
  socialProviders: Schema.Array(SocialProvider),
}) {}
