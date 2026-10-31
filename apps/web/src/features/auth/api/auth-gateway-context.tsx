import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { betterAuthGateway } from "./auth-client.ts";
import type { AuthGateway } from "./auth-client.ts";

const AuthGatewayContext = createContext<AuthGateway>(betterAuthGateway);

export const AuthGatewayProvider = ({
  gateway,
  children,
}: {
  readonly gateway: AuthGateway;
  readonly children: ReactNode;
}) => <AuthGatewayContext value={gateway}>{children}</AuthGatewayContext>;

export const useAuthGateway = () => useContext(AuthGatewayContext);
