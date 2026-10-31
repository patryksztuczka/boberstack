import { Button } from "@boberstack/ui/components/button";
import { Link, Outlet, useNavigate } from "react-router";

import { authClient } from "../features/auth/index.ts";
import { m } from "../paraglide/messages.js";
import { REPOSITORY_URL } from "../shared/brand/links.ts";
import { Wordmark } from "../shared/brand/wordmark.tsx";
import { queryClient } from "../shared/query-client.ts";

const NAV_BUTTON = "h-9 rounded-lg border-[1.5px] border-foreground px-3.5 font-semibold";

export const AppLayout = () => {
  const navigate = useNavigate();
  const session = authClient.useSession();

  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    await navigate("/sign-in");
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-[768px] flex-col gap-10 px-6 py-9">
      <header className="flex items-center justify-between gap-4">
        <h1>
          <Link to="/" className="text-[30px]">
            <Wordmark />
          </Link>
        </h1>
        <nav className="flex items-center gap-5">
          <a
            href={REPOSITORY_URL}
            className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {m.nav_github()}
          </a>
          {session.data === null ? (
            <Button asChild variant="outline" className={NAV_BUTTON}>
              <Link to="/sign-in">{m.nav_sign_in()}</Link>
            </Button>
          ) : (
            <Button variant="outline" className={NAV_BUTTON} onClick={signOut}>
              {m.nav_sign_out()}
            </Button>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
