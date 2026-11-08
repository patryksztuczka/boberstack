import { redirect } from "react-router";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

import { mcpClientRequest } from "../mcp-client-request.ts";
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

export const redirectSignedInWith =
  (gateway: Pick<AuthGateway, "isSignedIn">) =>
  async ({ request }: LoaderFunctionArgs) => {
    const { searchParams } = new URL(request.url);

    if (mcpClientRequest(searchParams) !== undefined) return null;

    return (await gateway.isSignedIn())
      ? redirect(safeRedirectTo(searchParams.get("redirectTo")))
      : null;
  };

export const redirectSignedIn = redirectSignedInWith(betterAuthGateway);
