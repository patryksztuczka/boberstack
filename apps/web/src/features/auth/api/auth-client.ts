import { createAuthClient } from "better-auth/react";
import { redirect } from "react-router";

export const authClient = createAuthClient({ basePath: "/api/auth" });

export const requireSession = async () => {
  const session = await authClient.getSession();

  if (session.data === null) {
    throw redirect("/sign-in");
  }

  return session.data;
};

export const redirectSignedIn = async () => {
  const session = await authClient.getSession();

  return session.data === null ? null : redirect("/todos");
};
