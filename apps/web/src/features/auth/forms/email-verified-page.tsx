import { Button } from "@boberstack/ui/components/button";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { AuthPage, Notice, PRIMARY_ACTION } from "../components/auth-page.tsx";
import { absoluteUrl, safeRedirectTo } from "../redirect-to.ts";
import { EmailOnlyForm } from "./email-form.tsx";

export const EmailVerifiedPage = () => {
  const gateway = useAuthGateway();
  const [searchParams] = useSearchParams();
  const [sentTo, setSentTo] = useState<string | undefined>(undefined);

  if (searchParams.get("error") === null) {
    return (
      <AuthPage title={m.auth_email_verified_title()} description={m.auth_email_verified_body()}>
        <Button asChild className={PRIMARY_ACTION}>
          <Link to={safeRedirectTo(searchParams.get("redirectTo"))}>
            {m.auth_email_verified_continue()}
          </Link>
        </Button>
      </AuthPage>
    );
  }

  return (
    <AuthPage title={m.auth_verify_failed_title()} description={m.auth_verify_failed_body()}>
      {sentTo === undefined ? (
        <EmailOnlyForm
          submitLabel={m.auth_resend()}
          onSubmit={async ({ email }) => {
            await gateway.sendVerificationEmail(email, absoluteUrl("/email-verified"));
            setSentTo(email);
          }}
        />
      ) : (
        <Notice>{m.auth_check_email_body({ email: sentTo })}</Notice>
      )}
      <Link to="/sign-in" className="text-sm underline underline-offset-4">
        {m.auth_back_to_sign_in()}
      </Link>
    </AuthPage>
  );
};
