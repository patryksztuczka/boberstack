# MCP is a third transport, served per request

**Status:** accepted, 2026-11-08.

AI assistants such as Claude and Cursor call products through the Model Context Protocol. We wanted them to reach the same service methods as the web app, on the Worker we already deploy. Effect 4 ships an MCP server in `effect/ai`, so no second SDK and no second schema language were needed. The choice was which of its HTTP transports to use. `McpServer.layerHttp` keeps one long-lived server fiber that every request shares; a Cloudflare Worker gives no guarantee that the next request reaches the same isolate, so sessions and open streams would be lost between requests.

The api serves MCP at `/api/mcp` with `McpServer.layerHttpRequestScoped` and only the stateless protocol revision `2026-07-28`. Each POST runs its own server inside the request and leaves nothing behind. Tools follow root ADR 0007 and 0009: a `Toolkit` in `packages/domain/src/<context>/*.mcp.ts` built from the context's schemas, and thin handlers in `apps/api/src/mcp/` that read the Current User and call one service method. An HTTP middleware from `packages/auth` provides the Current User before any tool runs (Identity ADR 0002).

## Consequences

- No sessions, no `subscriptions/listen`, no `listChanged` notifications and no `McpServer.elicit`. A client that speaks only a sessionful revision (2025-11-25 or older) cannot connect.
- Handlers read `CurrentUser` with `Effect.serviceOption` and die when it is missing. Declaring it as a tool dependency would make it a requirement of the layer, which exists before any request does. `apps/api/src/mcp/mcp.layer.test.ts` proves the middleware's user reaches the handler.
- A tool error declared as `failure` reaches the model as a result with `isError: true`, not as a protocol error.
- `effect/ai` is marked unstable, so it is in `allowedUnstableApis` in `tsconfig.base.json`. An Effect upgrade may change it.
- The web dev server proxies `/api/mcp` without rewriting `Origin`: `McpServer` answers 403 to an `Origin` it does not allow.

## Considered options

- `layerHttp` in a Durable Object: sessions and subscriptions, at the cost of a new Alchemy resource and state per client. Revisit when a client needs live updates.
- stdio in `apps/cli`: local only, and the CLI would still need a token to call the api.
- The official MCP TypeScript SDK: a second schema language beside Effect Schema.
