import { Button } from "@boberstack/ui/components/button";
import { effectTsResolver } from "@hookform/resolvers/effect-ts";
import { useForm, useFormState } from "react-hook-form";

import { m } from "../../../paraglide/messages.js";
import { PRIMARY_ACTION } from "../components/auth-page.tsx";
import { EmailForm } from "./auth-form.schema.ts";
import type { EmailFormValues, EmailInput } from "./auth-form.schema.ts";
import { FormField } from "./form-field.tsx";

export const EmailOnlyForm = ({
  submitLabel,
  onSubmit,
}: {
  readonly submitLabel: string;
  readonly onSubmit: (input: EmailInput) => Promise<void>;
}) => {
  const form = useForm<EmailFormValues, unknown, EmailInput>({
    resolver: effectTsResolver(EmailForm),
    defaultValues: { email: "" },
  });

  const { errors, isSubmitting } = useFormState({ control: form.control });

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        id="email"
        type="email"
        autoComplete="email"
        label={m.auth_email()}
        error={errors.email === undefined ? undefined : m.auth_email_invalid()}
        {...form.register("email")}
      />
      <Button type="submit" className={PRIMARY_ACTION} disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
};
