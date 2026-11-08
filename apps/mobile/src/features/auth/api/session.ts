import { useSyncExternalStore } from "react";

import { authClient } from "./auth-client.ts";

export const useIsSignedIn = () => authClient.useSession().data !== null;

export const useIsSignedOut = () => authClient.useSession().data === null;

export const useSessionLoading = () => {
  const session = authClient.useSession();

  return session.isPending && session.data === null;
};

let expired = false;

const listeners = new Set<() => void>();

const setExpired = (value: boolean) => {
  expired = value;

  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useSessionExpired = () => useSyncExternalStore(subscribe, () => expired);

export const clearSessionExpired = () => setExpired(false);

export const expireSession = async () => {
  setExpired(true);
  await authClient.signOut();
};

export const signOut = async () => {
  setExpired(false);
  await authClient.signOut();
};
