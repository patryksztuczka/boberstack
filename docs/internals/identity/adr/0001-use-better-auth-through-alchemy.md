# Use better-auth through Alchemy

**Status:** accepted, 2026-10-30.

Sign-in, sign-up and Sessions run on better-auth inside the api Worker, wired through `@alchemy.run/better-auth` so the Worker gets the auth instance, its secret and its database connection from the same Alchemy stack as everything else. Writing our own password hashing, session rotation and cookie handling is a security liability with no product value, and a hosted identity provider would add a second vendor, a second dashboard and a network hop on every request.

Identity's contract in `packages/domain` exposes only what other contexts need: the `CurrentUser` service, the HttpApi and RPC authentication middleware tags, and `UnauthorizedError` and `AuthenticationUnavailableError`. better-auth's own routes are served under `/api/auth/*`; no better-auth type crosses into `packages/domain` or a module.

## Consequences

- better-auth's tables are defined by SQL in `apps/api/migrations/`, like ours, and `@alchemy.run/better-auth`'s own deploy-time migration is turned off (root ADR 0006). Upgrading better-auth means diffing its schema and writing a migration.
- Adding a sign-in method (OAuth, passkeys) is a better-auth plugin plus its migration, and an owner sign-off because it widens who can sign in.
- Removing auth from the starter removes `platform/authentication`, the middleware from every contract, and the better-auth migrations ([Keep or cut](../../../operations/make-it-yours.md#keep-or-cut)).

## Considered options

- Hand-written sessions on Effect: rejected, see above.
- Clerk, Auth0 or WorkOS: rejected for the vendor and latency cost; revisit when enterprise SSO is a requirement.
- Cloudflare Access: protects a whole app, not individual Users in a product.
