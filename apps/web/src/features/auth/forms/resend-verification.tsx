import { Button } from "@boberstack/ui/components/button";
import { useState } from "react";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { Notice } from "../components/auth-page.tsx";
import { absoluteUrl } from "../redirect-to.ts";

export const ResendVerification = ({ email }: { readonly email: string }) => {
  const gateway = useAuthGateway();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [reason, setReason] = useState("");

  const resend = async () => {
    setState("sending");

    const result = await gateway.sendVerificationEmail(email, absoluteUrl("/email-verified"));

    if (result.ok) {
      setState("sent");
    } else {
      setReason(result.message);
      setState("failed");
    }
  };

  if (state === "sent") return <Notice>{m.auth_resent()}</Notice>;

  return (
    <div className="flex flex-col gap-3">
      {state === "failed" ? <Notice tone="error">{m.auth_failed({ reason })}</Notice> : undefined}
      <Button
        type="button"
        variant="link"
        className="h-auto self-start p-0 font-semibold text-foreground underline"
        disabled={state === "sending"}
        onClick={resend}
      >
        {m.auth_resend()}
      </Button>
    </div>
  );
};
