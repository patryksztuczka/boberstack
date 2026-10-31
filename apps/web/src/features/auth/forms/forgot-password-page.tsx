import { useState } from "react";
import { Link } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { AuthPage, Notice } from "../components/auth-page.tsx";
import { absoluteUrl } from "../redirect-to.ts";
import { EmailOnlyForm } from "./email-form.tsx";

export const ForgotPasswordPage = () => {
  const gateway = useAuthGateway();
  const [sentTo, setSentTo] = useState<string | undefined>(undefined);

  return (
    <AuthPage title={m.auth_forgot_title()} description={m.auth_forgot_description()}>
      {sentTo === undefined ? (
        <EmailOnlyForm
          submitLabel={m.auth_forgot_submit()}
          onSubmit={async ({ email }) => {
            await gateway.requestPasswordReset(email, absoluteUrl("/reset-password"));
            setSentTo(email);
          }}
        />
      ) : (
        <Notice>{m.auth_forgot_sent({ email: sentTo })}</Notice>
      )}
      <Link to="/sign-in" className="text-sm underline underline-offset-4">
        {m.auth_back_to_sign_in()}
      </Link>
    </AuthPage>
  );
};
