# AI assistants can run a program over the capabilities

**Status:** accepted, 2026-11-13.

Each capability is its own MCP tool (root ADR 0014). An assistant that needs several of them makes one call per turn and reads every result back through its context, and once a product has dozens of capabilities their tool list alone crowds that context. rat-stack's code mode answers both, and we took it: `toCodeMode` in `@boberstack/capability/code-mode` turns the capability list into two more MCP tools. `search` finds capabilities by intent and returns their TypeScript signatures. `execute` runs a short JavaScript program in which each `tools.<name>(input)` call is checked against that capability's input schema and runs on the api as the same Current User, like a direct tool call.

The program runs outside the api process. On the Node host it is a child `node` started with `--permission` and `--disallow-code-generation-from-strings`, an empty environment and a 64 MB heap cap, inside a `vm` context with a 10-second deadline; it talks to the api only through JSON lines on stdin and stdout. Node's permission model leaves it no file system, child processes, workers or network, and the empty environment leaves it no secrets. On the Cloudflare host it is a Dynamic Worker from a Worker Loader binding (`CODE_SANDBOX`) with no outbound network and CPU and subrequest limits.

## Consequences

- The direct tools stay next to `search` and `execute`. When the catalog grows past what a model reads comfortably, drop the direct `Toolkit` from `apps/api/src/mcp/mcp.layer.ts` and keep code mode.
- Code mode is MCP only; HttpApi and RPC do not serve `execute`.
- Every `execute` starts a process on the Node host. Nothing limits how often a signed-in user calls it yet; add a rate limit before the api serves untrusted users at scale.
- A program can do no more than its user could through the direct tools, because every call goes through a capability and the Current User. The `vm` context is not the boundary; the process (Node) or the isolate (Cloudflare) is.
- A program that calls `import()` on Node 26 waits out the deadline instead of failing at once.
- The capability projections run a handler with the layer's services underneath the request's: on Workers, `@alchemy.run/sql` keeps a Postgres pool per request `Scope`, and a layer's `Scope` above the request's made code mode reuse the first request's pool and hang.
- `@effect/platform-node` is a dev dependency of `packages/capability`, for the subprocess tests. `effect/process` is not in `allowedUnstableApis`, so the subprocess sandbox and its test turn off `unstableApiUsage` with a reason.

## Considered options

- Direct tools only: no program runs on our hosts, but every chained operation costs a model turn, and a large catalog does not fit.
- `isolated-vm` on Node: a native dependency that has to build for each Node major, where the permission model already gives a process boundary.
- Code mode only: fewer tools, but with four todos operations the direct tools are easier for a model to use and for a person to read in a client.
