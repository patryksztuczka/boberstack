import type { SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { Button } from "@boberstack/ui/components/button";
import { useState } from "react";

import { m } from "../../../paraglide/messages.js";
import { useAuthGateway } from "../api/auth-gateway-context.tsx";
import { useSocialProviders } from "../api/sign-in-methods.queries.ts";
import { absoluteUrl } from "../redirect-to.ts";
import { Divider, Notice, SECONDARY_ACTION } from "./auth-page.tsx";

const PROVIDER_NAMES = { github: "GitHub", google: "Google" } satisfies Record<
  SocialProvider,
  string
>;

const GitHubMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-current">
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.81Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.86-3c-1.08.72-2.45 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.1A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.25 14.26a7.2 7.2 0 0 1 0-4.52v-3.1H1.26a12 12 0 0 0 0 10.72l3.99-3.1Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.26 6.64l3.99 3.1C6.2 6.89 8.86 4.77 12 4.77Z"
    />
  </svg>
);

const MARKS = { github: GitHubMark, google: GoogleMark } satisfies Record<
  SocialProvider,
  () => React.JSX.Element
>;

export const SocialButtons = ({ redirectTo }: { readonly redirectTo: string }) => {
  const providers = useSocialProviders();
  const gateway = useAuthGateway();
  const [failure, setFailure] = useState<string | undefined>(undefined);

  if (providers.length === 0) return undefined;

  const continueWith = async (provider: SocialProvider) => {
    const result = await gateway.signInSocial(provider, absoluteUrl(redirectTo));

    if (!result.ok) setFailure(m.auth_failed({ reason: result.message }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {providers.map((provider) => {
          const Mark = MARKS[provider];

          return (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className={SECONDARY_ACTION}
              onClick={() => continueWith(provider)}
            >
              <Mark />
              {m.auth_continue_with({ provider: PROVIDER_NAMES[provider] })}
            </Button>
          );
        })}
      </div>
      {failure === undefined ? undefined : <Notice tone="error">{failure}</Notice>}
      <Divider label={m.auth_or()} />
    </div>
  );
};
