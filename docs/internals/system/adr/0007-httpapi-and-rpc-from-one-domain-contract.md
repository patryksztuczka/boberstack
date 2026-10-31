# HttpApi and RPC from one domain contract

**Status:** accepted, 2026-10-30.

Everything that crosses the boundary between apps, records, branded ids, wire errors with their HTTP status, the `HttpApi` with its groups, the `RpcGroup`s and the authentication middleware tags, is defined once in `packages/domain`. The api implements it, and the web app and the CLI call it with clients derived from the same definitions. The api serves both transports from one Worker: `HttpApi` for REST and the OpenAPI document, Effect RPC for typed calls with typed errors.

A shape defined twice drifts. With one contract, a renamed field or a new error fails the build on both sides, a React Hook Form form validates with the schema the endpoint decodes, and the OpenAPI document is generated, never written by hand.

## Consequences

- `packages/domain` imports only `effect`. It never imports an app, a vendor SDK or a server module, because the browser bundles it.
- An operation exposed on both transports is declared twice, once per group, over the same schemas, and implemented by one service method. Keep handlers thin so the two cannot diverge.
- A transport you do not need can be cut without touching the domain ([Keep or cut](../../../operations/make-it-yours.md#keep-or-cut)).

## Considered options

- tRPC or GraphQL: a second schema language beside Effect Schema.
- rat-stack's single `defineContract` projected onto every surface: one declaration per operation, at the cost of a projection layer we would maintain ourselves.
