import { Button } from "@boberstack/ui/components/button";
import { effectTsResolver } from "@hookform/resolvers/effect-ts";
import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { AuthPage, Notice, PRIMARY_ACTION } from "../components/auth-page.tsx";
import { SocialButtons } from "../components/social-buttons.tsx";
import { absoluteUrl, safeRedirectTo } from "../redirect-to.ts";
import { SignInForm } from "./auth-form.schema.ts";
import type { SignInFormValues, SignInInput } from "./auth-form.schema.ts";
import { FormField } from "./form-field.tsx";
import { ResendVerification } from "./resend-verification.tsx";

const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

type Failure =
  | { readonly kind: "unverified"; readonly email: string }
  | { readonly kind: "other"; readonly reason: string };

export const SignInPage = () => {
  const navigate = useNavigate();
  const gateway = useAuthGateway();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirectTo(searchParams.get("redirectTo"));
  const [failure, setFailure] = useState<Failure | undefined>(undefined);

  const form = useForm<SignInFormValues, unknown, SignInInput>({
    resolver: effectTsResolver(SignInForm),
    defaultValues: { email: "", password: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    const result = await gateway.signInEmail(input.email, input.password, absoluteUrl(redirectTo));

    if (result.ok) {
      await navigate(redirectTo);
    } else if (result.code === EMAIL_NOT_VERIFIED) {
      setFailure({ kind: "unverified", email: input.email });
    } else {
      setFailure({ kind: "other", reason: result.message });
    }
  });

  return (
    <AuthPage title={m.auth_sign_in_title()} description={m.auth_sign_in_description()}>
      {searchParams.get("expired") === "1" ? (
        <Notice>{m.auth_session_expired()}</Notice>
      ) : undefined}
      <SocialButtons redirectTo={redirectTo} />
      <form noValidate className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FormField
          id="email"
          type="email"
          autoComplete="email"
          label={m.auth_email()}
          error={errors.email === undefined ? undefined : m.auth_email_invalid()}
          {...form.register("email")}
        />
        <div className="flex flex-col gap-2">
          <FormField
            id="password"
            type="password"
            autoComplete="current-password"
            label={m.auth_password()}
            error={errors.password === undefined ? undefined : m.auth_password_invalid()}
            {...form.register("password")}
          />
          <Link
            to="/forgot-password"
            className="self-end text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {m.auth_forgot_password_link()}
          </Link>
        </div>
        {failure?.kind === "unverified" ? (
          <div className="flex flex-col gap-2">
            <Notice>{m.auth_unverified({ email: failure.email })}</Notice>
            <ResendVerification email={failure.email} />
          </div>
        ) : undefined}
        {failure?.kind === "other" ? (
          <Notice tone="error">{m.auth_failed({ reason: failure.reason })}</Notice>
        ) : undefined}
        <Button type="submit" className={PRIMARY_ACTION} disabled={isSubmitting}>
          {m.auth_sign_in_submit()}
        </Button>
      </form>
      <Link
        to={`/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`}
        className="text-center text-sm underline underline-offset-4"
      >
        {m.auth_to_sign_up()}
      </Link>
    </AuthPage>
  );
};
