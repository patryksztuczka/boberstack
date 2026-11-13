# One contract per operation, projected onto every transport

**Status:** accepted, 2026-11-13.

Root ADR 0005 put the `HttpApi` and the `RpcGroup` in `packages/domain` and accepted that an operation is declared once per transport. Root ADR 0012 added MCP as a third. A Todos operation was then written three times in `packages/domain` (an endpoint, an RPC and a tool) and handled three times in `apps/api`, each copy calling the same service method. The copies agreed only because someone kept them in step, and every new transport would have added a fourth.

Each operation is now one contract: `defineContract` in `packages/domain/src/<context>/<context>.contracts.ts` names it and gives its title, description, input, output, failure, MCP annotations and HTTP route. `packages/capability` projects a list of contracts onto each transport: `toHttpApiGroup`, `toRpcGroup` and `toToolkit` return Effect's own `HttpApiGroup`, `RpcGroup` and `Toolkit`, so middleware, prefixes, OpenAPI and the typed clients work as before. The api implements each contract once with `implement(contract, handler)` in `apps/api/src/capabilities/`, and `toHttpApiHandlers`, `toRpcHandlers` and `toToolkitHandlers` serve that one list on every transport. The pattern and much of the code come from [rat-stack](https://github.com/joelhooks/rat-stack) (root `UPSTREAM.md`).

## Consequences

- `packages/domain` imports `effect` and `@boberstack/capability`, and nothing else. `packages/capability` imports only `effect`, so the browser can still bundle the domain.
- An HTTP route names its path parameters from the input's fields. The other fields go in the query for `GET` and `DELETE` and in the body otherwise. A route's `status` sets the success status; an output of `Schema.Void` answers 204. A failure without an `httpApiStatus` answers 422.
- An output is an object, never a bare array, because an MCP tool's structured result must be one: `listTodos` answers `{ todos }` on every transport.
- The projection functions erase each capability's types inside a loop and restore them at their return type. Those casts live in `packages/capability` only, each with a `SAFETY` comment, and its tests run every projection over a sample domain.
- A service a transport provides per request, such as the Current User, is excluded from the handler layer's requirements: `HttpApi` and RPC read it from the group's middleware, and `toToolkitHandlers` takes it as a list and dies, naming it, when the MCP middleware did not provide it.
- Every capability call runs in a span named `capability.<name>`.
- Cutting a transport means removing its projection and its layer, not a file per context.
- The CLI has no capability commands yet. Running one needs a Current User, and how the CLI signs in is still open.

## Considered options

- Keep a contract per transport (root ADR 0005): no projection code to maintain, but three declarations and three handlers per operation, and a fourth with every new transport.
- Copy rat-stack's `packages/capability` unchanged: its `toHttpApi` builds the api and its handlers in one call from implemented capabilities, so the browser could not get the contract without the server code, and it supplies its own HTTP middleware in place of the domain's authentication tags.
