import { Schema } from "effect";

const MIN_PASSWORD_LENGTH = 8;

const Email = Schema.Trim.pipe(
  Schema.decodeTo(Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
);

const Password = Schema.String.check(Schema.isMinLength(MIN_PASSWORD_LENGTH));

export const SignInForm = Schema.Struct({ email: Email, password: Password });

export type SignInFormValues = typeof SignInForm.Encoded;

export type SignInInput = typeof SignInForm.Type;

export const SignUpForm = Schema.Struct({
  name: Schema.Trim.pipe(Schema.decodeTo(Schema.NonEmptyString)),
  email: Email,
  password: Password,
});

export type SignUpFormValues = typeof SignUpForm.Encoded;

export type SignUpInput = typeof SignUpForm.Type;
