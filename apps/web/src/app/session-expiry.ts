import { onSessionExpired } from "@boberstack/client-runtime/session";
import { RegistryContext } from "@effect/atom-react";
import { useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { signInPath } from "../features/auth/index.ts";

export const useSessionExpiry = () => {
  const registry = useContext(RegistryContext);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(
    () =>
      onSessionExpired(registry, () => {
        if (pathname !== "/sign-in") void navigate(signInPath(`${pathname}${search}`, true));
      }),
    [registry, navigate, pathname, search],
  );
};
