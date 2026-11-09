import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import { RegistryContext, RegistryProvider, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useContext, useEffect } from "react";
import type { ReactNode } from "react";

import { expireSession, useSessionUserId } from "../features/auth/index.ts";
import { watchSessionExpiry } from "./session-expiry.ts";

const SessionExpiryWatcher = ({ children }: { readonly children: ReactNode }) => {
  const registry = useContext(RegistryContext);

  useEffect(() => watchSessionExpiry(registry, expireSession), [registry]);

  return children;
};

export const SessionAtoms = ({ children }: { readonly children: ReactNode }) => {
  const layer = useAtomValue(clientLayer);
  const userId = useSessionUserId();

  return (
    <RegistryProvider
      key={userId ?? "signed-out"}
      initialValues={[Atom.initialValue(clientLayer, layer)]}
    >
      <SessionExpiryWatcher>{children}</SessionExpiryWatcher>
    </RegistryProvider>
  );
};
