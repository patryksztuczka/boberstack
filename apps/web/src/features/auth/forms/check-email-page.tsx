import { Link, useSearchParams } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { AuthPage } from "../components/auth-page.tsx";
import { ResendVerification } from "./resend-verification.tsx";

export const CheckEmailPage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return (
    <AuthPage
      title={m.auth_check_email_title()}
      description={
        email === "" ? m.auth_check_email_body_unknown() : m.auth_check_email_body({ email })
      }
    >
      <p className="text-sm text-muted-foreground">{m.auth_check_email_hint()}</p>
      {email === "" ? undefined : <ResendVerification email={email} />}
      <Link to="/sign-in" className="text-sm underline underline-offset-4">
        {m.auth_back_to_sign_in()}
      </Link>
    </AuthPage>
  );
};
