import { Button } from "@boberstack/ui/components/button";
import { effectTsResolver } from "@hookform/resolvers/effect-ts";
import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import { Link, useSearchParams } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { AuthPage, Notice, PRIMARY_ACTION } from "../components/auth-page.tsx";
import { ResetPasswordForm } from "./auth-form.schema.ts";
import type { ResetPasswordFormValues, ResetPasswordInput } from "./auth-form.schema.ts";
import { FormField } from "./form-field.tsx";

const ExpiredLink = () => (
  <AuthPage title={m.auth_reset_invalid_title()} description={m.auth_reset_invalid_body()}>
    <Button asChild className={PRIMARY_ACTION}>
      <Link to="/forgot-password">{m.auth_reset_request_new()}</Link>
    </Button>
  </AuthPage>
);

const NewPasswordForm = ({ token }: { readonly token: string }) => {
  const gateway = useAuthGateway();
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const form = useForm<ResetPasswordFormValues, unknown, ResetPasswordInput>({
    resolver: effectTsResolver(ResetPasswordForm),
    defaultValues: { password: "", confirm: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    const result = await gateway.resetPassword(input.password, token);

    if (result.ok) setDone(true);
    else setFailure(result.message);
  });

  if (done) {
    return (
      <AuthPage title={m.auth_reset_done_title()} description={m.auth_reset_done_body()}>
        <Button asChild className={PRIMARY_ACTION}>
          <Link to="/sign-in">{m.auth_sign_in_submit()}</Link>
        </Button>
      </AuthPage>
    );
  }

  return (
    <AuthPage title={m.auth_reset_title()} description={m.auth_reset_description()}>
      <form noValidate className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FormField
          id="password"
          type="password"
          autoComplete="new-password"
          label={m.auth_password()}
          error={errors.password === undefined ? undefined : m.auth_password_invalid()}
          {...form.register("password")}
        />
        <FormField
          id="confirm"
          type="password"
          autoComplete="new-password"
          label={m.auth_password_confirm()}
          error={errors.confirm === undefined ? undefined : m.auth_password_mismatch()}
          {...form.register("confirm")}
        />
        {failure === undefined ? undefined : (
          <Notice tone="error">{m.auth_failed({ reason: failure })}</Notice>
        )}
        <Button type="submit" className={PRIMARY_ACTION} disabled={isSubmitting}>
          {m.auth_reset_submit()}
        </Button>
      </form>
    </AuthPage>
  );
};

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  if (searchParams.get("error") !== null || token === null || token === "") return <ExpiredLink />;

  return <NewPasswordForm token={token} />;
};
