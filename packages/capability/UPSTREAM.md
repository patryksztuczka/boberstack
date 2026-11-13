# Adapted from rat-stack

Source: [rat-stack](https://github.com/joelhooks/rat-stack) `packages/capability` and the Worker Loader sandbox in `apps/site/src/`, by Joel Hooks, MIT. Its license is reproduced below.

The capability code reached this repository through `wagmi`, the owner's local rat-stack-inspired starter, which copied rat-stack's `packages/capability` at its October 2026 `main` (its `PROVENANCE.md` records that). On 2026-11-13 it was compared with rat-stack's `main` at commit `1015292`: the projection code had changed only in formatting and in features this copy leaves out. Code mode (`src/code-mode/`) was ported from that commit directly.

`defineContract`, `implement`, the projections onto HttpApi, RPC and MCP, and code mode follow rat-stack's design. `src/contract.ts`, `src/http-api.ts`, `src/rpc.ts`, `src/toolkit.ts` and `src/code-mode/` keep parts of its code: the route and path-parameter types, the split of the input into params, query and payload, the failure statuses, the tool annotations, the capability catalog and its search, the sandbox protocol and its limits, and the Node subprocess and Worker Loader sandboxes. Root ADRs 0014 and 0015 record why and how this copy differs:

- The projections return Effect's own `HttpApiGroup`, `RpcGroup` and `Toolkit` from contracts alone, so `packages/domain` holds them and adds its own middleware and prefix. The handler layers are separate functions (`toHttpApiHandlers`, `toRpcHandlers`, `toToolkitHandlers`, `toCodeModeHandlers`) that take the implemented capabilities.
- A contract has a `title`, and an HTTP route has a success `status`. An output of `Schema.Void` answers 204.
- Per-request services come from the transport's middleware (the Current User). A handler runs with the layer's services underneath the request's, never above them.
- Code mode lives behind its own entry point, `@boberstack/capability/code-mode`, so the browser bundle of `packages/domain` never reaches the sandbox code. The subprocess also caps the heap (`--max-old-space-size`). The Worker Loader dispatcher is a plain function instead of an `RpcTarget` subclass, so nothing on the host imports `cloudflare:workers`.
- Left out: approval (`needsApproval`, `Approval`, `ApprovalDenied`), `CallWatch`, `ActorWatch`, `aroundHandlers`, `toCommand`, HTTP `provide` hooks and `decodeRefusal`. `implement` opens a span per call instead of `CallWatch`.

---

MIT License

Copyright (c) 2026 Joel Hooks

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
