# Adapted from rat-stack

Source: [rat-stack](https://github.com/joelhooks/rat-stack) `packages/capability`, by Joel Hooks, MIT. Its license is reproduced below. It reached this repository through a copy taken at rat-stack's October 2026 `main`.

`defineContract`, `implement` and the projections onto HttpApi, RPC and MCP follow rat-stack's design, and `src/contract.ts`, `src/http-api.ts`, `src/rpc.ts` and `src/toolkit.ts` keep parts of its code: the route and path-parameter types, the split of the input into params, query and payload, the failure statuses and the tool annotations. Root ADR 0014 records why and how this copy differs:

- The projections return Effect's own `HttpApiGroup`, `RpcGroup` and `Toolkit` from contracts alone, so `packages/domain` holds them and adds its own middleware and prefix. The handler layers are separate functions (`toHttpApiHandlers`, `toRpcHandlers`, `toToolkitHandlers`) that take the implemented capabilities.
- A contract has a `title`, and an HTTP route has a success `status`. An output of `Schema.Void` answers 204.
- Per-request services come from the transport's middleware (the Current User); there is no `RequestHeaders` reference.
- Left out: approval (`needsApproval`, `Approval`, `ApprovalDenied`), `CallWatch`, `ActorWatch` and `toCommand`. `implement` opens a span per call instead of `CallWatch`.

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
