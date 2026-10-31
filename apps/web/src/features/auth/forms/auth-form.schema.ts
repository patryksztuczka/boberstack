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

export const EmailForm = Schema.Struct({ email: Email });

export type EmailFormValues = typeof EmailForm.Encoded;

export type EmailInput = typeof EmailForm.Type;

export const ResetPasswordForm = Schema.Struct({
  password: Password,
  confirm: Schema.String,
}).check(
  Schema.makeFilter((values) =>
    values.password === values.confirm ? undefined : { path: ["confirm"], issue: "mismatch" },
  ),
);

export type ResetPasswordFormValues = typeof ResetPasswordForm.Encoded;

export type ResetPasswordInput = typeof ResetPasswordForm.Type;
