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
import { SignUpForm } from "./auth-form.schema.ts";
import type { SignUpFormValues, SignUpInput } from "./auth-form.schema.ts";
import { FormField } from "./form-field.tsx";

export const SignUpPage = () => {
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const form = useForm<SignUpFormValues, unknown, SignUpInput>({
    resolver: effectTsResolver(SignUpForm),
    defaultValues: { name: "", email: "", password: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    const result = await authClient.signUp.email(input);

    if (result.error === null) {
      await navigate("/todos");
    } else {
      setFailure(m.auth_failed({ reason: result.error.message ?? result.error.statusText }));
    }
  });

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>{m.auth_sign_up_title()}</CardTitle>
        <CardDescription>{m.auth_sign_up_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate className="grid gap-4" onSubmit={onSubmit}>
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
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {m.auth_sign_up_submit()}
          </Button>
          <Link to="/sign-in" className="text-center text-sm underline">
            {m.auth_to_sign_in()}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
};
