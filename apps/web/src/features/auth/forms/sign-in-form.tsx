import { Button } from "@boberstack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@boberstack/ui/components/card";
import { effectTsResolver } from "@hookform/resolvers/effect-ts";
import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { authClient } from "../api/auth-client.ts";
import { SignInForm } from "./auth-form.schema.ts";
import type { SignInFormValues, SignInInput } from "./auth-form.schema.ts";
import { FormField } from "./form-field.tsx";

export const SignInPage = () => {
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const form = useForm<SignInFormValues, unknown, SignInInput>({
    resolver: effectTsResolver(SignInForm),
    defaultValues: { email: "", password: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    const result = await authClient.signIn.email(input);

    if (result.error === null) {
      await navigate("/todos");
    } else {
      setFailure(m.auth_failed({ reason: result.error.message ?? result.error.statusText }));
    }
  });

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>{m.auth_sign_in_title()}</CardTitle>
        <CardDescription>{m.auth_sign_in_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate className="grid gap-4" onSubmit={onSubmit}>
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
            autoComplete="current-password"
            label={m.auth_password()}
            error={errors.password === undefined ? undefined : m.auth_password_invalid()}
            {...form.register("password")}
          />
          {failure === undefined ? undefined : (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {m.auth_sign_in_submit()}
          </Button>
          <Link to="/sign-up" className="text-center text-sm underline">
            {m.auth_to_sign_up()}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
};
