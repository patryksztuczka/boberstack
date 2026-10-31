import { redirect } from "react-router";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

import { safeRedirectTo, signInPath } from "../redirect-to.ts";
import { betterAuthGateway } from "./auth-client.ts";
import type { AuthGateway } from "./auth-client.ts";

export const requireSessionWith =
  (gateway: Pick<AuthGateway, "isSignedIn">): MiddlewareFunction =>
  async ({ request }) => {
    if (await gateway.isSignedIn()) return;

    const url = new URL(request.url);

    throw redirect(signInPath(`${url.pathname}${url.search}`));
  };

export const requireSession = requireSessionWith(betterAuthGateway);

export const redirectSignedIn = async ({ request }: LoaderFunctionArgs) =>
  (await betterAuthGateway.isSignedIn())
    ? redirect(safeRedirectTo(new URL(request.url).searchParams.get("redirectTo")))
    : null;
