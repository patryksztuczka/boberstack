# Context map

## Contexts

- [Todos](./docs/internals/todos/GLOSSARY.md): owns the Todos a User keeps, their titles and whether each is done. The example context; replace it with your product's first one.
- [Identity](./docs/internals/identity/GLOSSARY.md): owns every User, how they sign in and their Sessions. Sign-in runs on better-auth (Identity ADR 0001).

## Relationships

- **Identity → Todos**: every Todo belongs to one User, referenced by id only. Todos learns who is calling from Identity's authentication middleware, which provides the Current User to each request; Todos never reads Identity's tables. A request without a valid Session is refused before a Todos handler runs.
- **Todos → Identity**: none. Identity knows nothing about Todos, so removing the Todos context leaves sign-in working.

## Where each context's documents live

Each context keeps its glossary, its ADRs and any module files in its own folder under [docs/internals](./docs/internals). Decisions that belong to no single context live in [docs/internals/system/adr](./docs/internals/system/adr).

| Context            | Docs                                                 | Code                                                                                     | ADRs cited as |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| Todos              | [docs/internals/todos](./docs/internals/todos)       | `apps/api/src/modules/todos`, `packages/domain/src/todos`, `apps/web/src/features/todos` | Todos ADR     |
| Identity           | [docs/internals/identity](./docs/internals/identity) | `apps/api/src/platform/authentication`, `packages/domain/src/identity`                   | Identity ADR  |
| none (system-wide) | [docs/internals/system](./docs/internals/system)     |                                                                                          | root ADR      |

Identity has no `modules/` folder yet: better-auth holds its rules, and the adapter in `platform/authentication` maps them to the contract. It gets one when Identity grows rules of its own.
