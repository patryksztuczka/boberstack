import { mcpClientProfile } from "@boberstack/client-runtime/identity";
import { Button } from "@boberstack/ui/components/button";
import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Match } from "effect";
import { AsyncResult } from "effect/reactivity";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { AuthPage, Notice, PRIMARY_ACTION, SECONDARY_ACTION } from "../components/auth-page.tsx";
import { isMcpRequestExpired, mcpClientRequest } from "../mcp-client-request.ts";
import type { McpClientRequest } from "../mcp-client-request.ts";

const SCOPE_LABELS = new Map<string, () => string>([
  ["openid", m.auth_consent_scope_openid],
  ["profile", m.auth_consent_scope_profile],
  ["email", m.auth_consent_scope_email],
  ["offline_access", m.auth_consent_scope_offline_access],
]);

const scopeLabel = (scope: string) =>
  SCOPE_LABELS.get(scope)?.() ?? m.auth_consent_scope_other({ scope });

const InvalidRequest = () => (
  <AuthPage title={m.auth_consent_invalid_title()} description={m.auth_consent_invalid_body()} />
);

type Decision =
  | { readonly kind: "idle" }
  | { readonly kind: "sending" }
  | { readonly kind: "failed"; readonly reason: string }
  | { readonly kind: "expired" };

const ConsentForm = ({
  request,
  client,
}: {
  readonly request: McpClientRequest;
  readonly client: string;
}) => {
  const gateway = useAuthGateway();
  const [decision, setDecision] = useState<Decision>({ kind: "idle" });

  const answer = async (allow: boolean) => {
    setDecision({ kind: "sending" });

    const result = await gateway.answerConsent(allow);

    if (result.ok && result.url !== undefined) {
      gateway.followRedirect(result.url);
    } else if (!result.ok && !isMcpRequestExpired(result.code)) {
      setDecision({ kind: "failed", reason: result.message });
    } else {
      setDecision({ kind: "expired" });
    }
  };

  if (decision.kind === "expired") return <InvalidRequest />;

  return (
    <AuthPage
      title={m.auth_consent_title({ client })}
      description={m.auth_consent_description({ client })}
    >
      <ul className="flex flex-col gap-3 rounded-[10px] bg-muted px-4 py-4 text-[15px]">
        {request.scopes.map((scope) => (
          <li key={scope} className="flex items-center gap-3">
            <CheckIcon aria-hidden="true" className="size-4 text-brand" />
            {scopeLabel(scope)}
          </li>
        ))}
      </ul>
      {request.returnsTo === undefined ? undefined : (
        <p className="text-sm text-muted-foreground">
          {m.auth_consent_returns_to({ host: request.returnsTo })}
        </p>
      )}
      {decision.kind === "failed" ? (
        <Notice tone="error">{m.auth_failed({ reason: decision.reason })}</Notice>
      ) : undefined}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          className={PRIMARY_ACTION}
          disabled={decision.kind === "sending"}
          onClick={() => answer(true)}
        >
          {m.auth_consent_allow()}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={SECONDARY_ACTION}
          disabled={decision.kind === "sending"}
          onClick={() => answer(false)}
        >
          {m.auth_consent_deny()}
        </Button>
      </div>
    </AuthPage>
  );
};

const ProfileUnavailable = ({
  reason,
  onRetry,
}: {
  readonly reason: string;
  readonly onRetry: () => void;
}) => (
  <AuthPage title={m.auth_consent_unavailable_title()}>
    <Notice tone="error">{m.auth_failed({ reason })}</Notice>
    <Button type="button" variant="outline" className={SECONDARY_ACTION} onClick={onRetry}>
      {m.auth_consent_retry()}
    </Button>
  </AuthPage>
);

const Consent = ({ request }: { readonly request: McpClientRequest }) => {
  const profileAtom = mcpClientProfile(request.clientId);
  const profile = useAtomValue(profileAtom);
  const retry = useAtomRefresh(profileAtom);

  return AsyncResult.matchWithError(profile, {
    onInitial: () => undefined,
    onSuccess: ({ value }) => <ConsentForm request={request} client={value.displayName} />,
    onError: (error) =>
      Match.valueTags(error, {
        McpClientNotFoundError: () => <InvalidRequest />,
        UnauthorizedError: () => undefined,
        McpClientDirectoryUnavailableError: ({ reason }) => (
          <ProfileUnavailable reason={reason} onRetry={retry} />
        ),
      }),
    onDefect: (defect) => <ProfileUnavailable reason={String(defect)} onRetry={retry} />,
  });
};

export const ConsentPage = () => {
  const [searchParams] = useSearchParams();
  const request = mcpClientRequest(searchParams);

  if (request === undefined) return <InvalidRequest />;

  return <Consent request={request} />;
};
