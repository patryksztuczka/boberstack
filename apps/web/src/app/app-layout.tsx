import { Button } from "@boberstack/ui/components/button";
import { Outlet, useNavigate } from "react-router";

import { authClient } from "../features/auth/index.ts";
import { m } from "../paraglide/messages.js";
import { LanguageSwitcher } from "../shared/i18n/language-switcher.tsx";
import { queryClient } from "../shared/query-client.ts";

export const AppLayout = () => {
  const navigate = useNavigate();
  const session = authClient.useSession();

  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    await navigate("/sign-in");
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{m.app_title()}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {session.data === null ? undefined : (
            <Button variant="outline" size="sm" onClick={signOut}>
              {m.nav_sign_out()}
            </Button>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
