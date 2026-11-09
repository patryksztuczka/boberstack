# better-auth is the authorization server for MCP clients

**Status:** accepted, 2026-11-08.

An MCP client has no Session cookie. The MCP authorization spec expects OAuth 2.1: the client finds the authorization server through `/.well-known/oauth-protected-resource`, signs the User in through the browser, asks for Consent, and sends a bearer access token bound to the MCP endpoint. We already run better-auth (Identity ADR 0001), and its `mcp()` plugin turns that instance into the authorization server, with `jwt()` signing the tokens.

`packages/auth` installs `jwt()` and `mcp()` only when `AUTH_BASE_URL` is set; without it, `/api/mcp` answers 503. MCP clients register through Dynamic Client Registration, open to anyone. Sign-in happens on the web app's `/sign-in`, which continues the authorization after a successful Sign-in, and Consent on `/oauth/consent`. The api routes `/.well-known/oauth-*` and `/.well-known/openid-configuration*` to better-auth.

The api verifies access tokens in-process: it reads the signing keys with `getJwks()` from the auth instance and checks the signature, the issuer (`<AUTH_BASE_URL>/api/auth`), the audience (`<AUTH_BASE_URL>/api/mcp`) and the `azp` claim, which only provider-issued access tokens carry. `requireMcpAuth` fetches the key set from the `/jwks` URL instead, and a Worker fetching its own hostname is not reliable on Cloudflare. It then loads the User by the token's `sub` and provides the Current User.

## Consequences

- The provider's tables (`jwks`, `oauthClients`, `oauthAccessTokens`, `oauthRefreshTokens`, `oauthConsents` and others) come from `packages/database/migrations/0001_init.sql`, like every other table (root ADR 0011). `packages/auth` gives each a plural `modelName`, because every table is named in the plural.
- DPoP is not supported: a sender-constrained token gets a 401, although the discovery document still lists DPoP algorithms. Clients that use plain bearer tokens are unaffected.
- No scope is enforced yet: any token with Consent for the MCP endpoint can call every tool. Per-tool scopes need `scopes` on `mcp()` and a check in the middleware.
- Every MCP request costs two reads: the signing keys and the User.
- On `/sign-in`, the web client turns off better-auth's built-in redirect plugin and follows redirects itself, so an authorization code is never requested twice.
- Sign-up or Password reset started from an MCP client's `/sign-in` does not return to the client.

## Considered options

- Client ID Metadata Documents (`cimd()`), the profile MCP 2026-07-28 recommends: on Workers we cannot build the SSRF-safe fetch it requires (pinned DNS resolution, special-use address checks). Revisit when it gets a Workers transport.
- Session cookies or API keys on `/api/mcp`: MCP clients do not send cookies, and pasted API keys bypass Consent.
