import type { McpClientId } from "@boberstack/domain/identity/mcp-client";
import { Atom } from "effect/reactivity";

import { clientRuntime } from "../atom-runtime/index.ts";
import { McpClientDirectory } from "./mcp-client-directory.ts";

export const mcpClientProfile = Atom.family((clientId: McpClientId) =>
  clientRuntime.atom(McpClientDirectory.use((directory) => directory.profileOf(clientId))),
);
