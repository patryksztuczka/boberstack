---
name: principle-boundary-discipline
description: Apply when wiring validation, decoding, error handling or an adapter. Parse and guard at the system's edges, trust the types inside, and keep business logic in service methods and pure functions.
---

# Boundary discipline

Validate where data enters the system. Inside, trust the types. Validation scattered through the call chain is noise, repeats itself and still misses the one place that mattered.

## The edges in this repo

| Edge               | Where it is parsed                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------- |
| HTTP and RPC input | the `HttpApi` / `RpcGroup` schemas in `packages/domain`, decoded before the handler runs |
| config and secrets | `Config` in a `layerConfig` in `platform/` (`config.pair`)                               |
| database rows      | the repository decodes rows into domain records (`schema.decode`)                        |
| other systems      | the adapter in `platform/<capability>/` turns their response into a domain type          |
| form input         | the contract's schema through `effectTsResolver` (`schema.forms`)                        |

## Rules

- Decode once, at the edge, with `Schema.decodeUnknownEffect`. Inside, take the decoded type and do not check it again.
- Do not pass the edge's own representation inward or outward: no raw request, SQL row, better-auth object or Cloudflare binding in a service signature. Expose the domain type.
- Handlers decode, call one service method and map its errors (`services.placement`). Logic in a handler is logic that cannot be tested without HTTP.
- Work that needs no services is a pure function next to the service.

Two questions settle most cases. "Is this data crossing an edge right now?" If not, the check is redundant. "Could this be a pure function the shell just calls?" If yes, extract it.
