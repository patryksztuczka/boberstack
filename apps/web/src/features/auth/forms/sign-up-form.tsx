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
import { SignUpForm } from "./auth-form.schema.ts";
import type { SignUpFormValues, SignUpInput } from "./auth-form.schema.ts";
import { FormField } from "./form-field.tsx";

export const SignUpPage = () => {
  const navigate = useNavigate();
  const gateway = useAuthGateway();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirectTo(searchParams.get("redirectTo"));
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const form = useForm<SignUpFormValues, unknown, SignUpInput>({
    resolver: effectTsResolver(SignUpForm),
    defaultValues: { name: "", email: "", password: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    const verified = `/email-verified?redirectTo=${encodeURIComponent(redirectTo)}`;

    const result = await gateway.signUpEmail(
      input.name,
      input.email,
      input.password,
      absoluteUrl(verified),
    );

    if (result.ok) {
      await navigate(`/check-email?email=${encodeURIComponent(input.email)}`);
    } else {
      setFailure(result.message);
    }
  });

  return (
    <AuthPage title={m.auth_sign_up_title()} description={m.auth_sign_up_description()}>
      <SocialButtons redirectTo={redirectTo} />
      <form noValidate className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FormField
          id="name"
          autoComplete="name"
          label={m.auth_name()}
          error={errors.name === undefined ? undefined : m.auth_name_invalid()}
          {...form.register("name")}
        />
        <FormField
          id="email"
          type="email"
          autoComplete="email"
          label={m.auth_email()}
          error={errors.email === undefined ? undefined : m.auth_email_invalid()}
          {...form.register("email")}
        />
        <FormField
          id="password"
          type="password"
          autoComplete="new-password"
          label={m.auth_password()}
          error={errors.password === undefined ? undefined : m.auth_password_invalid()}
          {...form.register("password")}
        />
        {failure === undefined ? undefined : (
          <Notice tone="error">{m.auth_failed({ reason: failure })}</Notice>
        )}
        <Button type="submit" className={PRIMARY_ACTION} disabled={isSubmitting}>
          {m.auth_sign_up_submit()}
        </Button>
      </form>
      <Link
        to={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}
        className="text-center text-sm underline underline-offset-4"
      >
        {m.auth_to_sign_in()}
      </Link>
    </AuthPage>
  );
};
