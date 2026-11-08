export interface McpClientRequest {
  readonly clientId: string;
  readonly scopes: ReadonlyArray<string>;
  readonly returnsTo: string | undefined;
}

const hostOf = (url: string | null) => {
  const host = url === null ? undefined : URL.parse(url)?.host;

  return host === undefined || host === "" ? undefined : host;
};

export const mcpClientRequest = (params: URLSearchParams): McpClientRequest | undefined => {
  const clientId = params.get("client_id");

  if (clientId === null || clientId === "" || !params.has("sig")) return undefined;

  return {
    clientId,
    scopes: (params.get("scope") ?? "").split(" ").filter((scope) => scope !== ""),
    returnsTo: hostOf(params.get("redirect_uri")),
  };
};

const EXPIRED_REQUEST_CODES = new Set(["invalid_signature", "invalid_request"]);

export const isMcpRequestExpired = (code: string | undefined) =>
  code !== undefined && EXPIRED_REQUEST_CODES.has(code);
