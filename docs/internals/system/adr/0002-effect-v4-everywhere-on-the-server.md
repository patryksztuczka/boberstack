# Effect v4 everywhere on the server

**Status:** accepted, 2026-10-30.

All server-side code, the api Worker, the CLI and the infrastructure program, is written in Effect v4, and the browser enters Effect through one `ManagedRuntime`. A codebase that mixes Effect with plain async code gets the costs of both: two error models, two ways to inject a dependency, and boundaries where typed failures turn back into thrown exceptions. Effect gives us typed errors in the signature, services and layers instead of module singletons, `Schema` at every boundary, and `HttpApi`, RPC, CLI and SQL from one library at one version.

The rules for writing it are in the `effect-v4` skill, and most of them are lint rules.

## Consequences

- Exact pin on `effect` and every `@effect/*` package, at one version: today 4.0.7, because 4.1.0 removed the `effect/Crypto` module Alchemy 2.0.0-beta.84 imports.
- A contributor new to Effect has more to learn before the first change. The skill, the lint messages and the installed `effect/AGENTS.md` are the path in.
- A library without Effect bindings is wrapped once, in `platform/`, with `Effect.tryPromise` and a typed error.

## Considered options

- Hono or plain Workers handlers with Zod: smaller to learn, but errors, dependencies and resources would each need a convention of our own.
- Effect only in the domain core: the boundary between Effect and non-Effect code would run through every handler.
