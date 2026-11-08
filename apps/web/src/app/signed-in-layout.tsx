import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import { RegistryProvider, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { Outlet } from "react-router";

import { useSessionExpiry } from "./session-expiry.ts";

const SessionOutlet = () => {
  useSessionExpiry();

  return <Outlet />;
};

export const SignedInLayout = () => {
  const layer = useAtomValue(clientLayer);

  return (
    <RegistryProvider initialValues={[Atom.initialValue(clientLayer, layer)]}>
      <SessionOutlet />
    </RegistryProvider>
  );
};
