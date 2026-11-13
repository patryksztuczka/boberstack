# 05 · Project structure

A bounded context is a folder. A file's name says what role it plays: a record, an error, a port, the logic or the SQL. SQL lives in one place, `packages/database/`, and a domain module in `packages/core` reaches it only through a store port. Why: root ADRs 0003 and 0007. The contexts themselves are in [`CONTEXT-MAP.md`](../../../../CONTEXT-MAP.md).

## Rules

### structure.tree: the tree

```
packages/domain/src/                 # the contract every side imports (06, schema.sharing)
  api.ts                             # HttpApi: every group
  system/health.http-api.ts
  todos/
    todo.ts                          # Todo, TodoId, TodoTitle, NewTodo, TodoPatch
    todo.errors.ts                   # errors that cross the wire, with httpApiStatus
    todos.contracts.ts               # a defineContract per operation; TodosHttpApi, TodosRpcs, TodosToolkit
  identity/
    user.ts, current-user.ts         # User, UserId, the CurrentUser service tag
    authentication.ts                # HttpApi and RPC middleware tags
    authentication.errors.ts

packages/core/src/                   # bounded contexts: services, ports, pure functions (root ADR 0007)
  todos/
    index.ts                         # the context's public surface, imported as @boberstack/core/todos
    todo.store.ts                    # port TodoStore
    todo.service.ts                  # TodosService
    todo.service.test.ts             # unit tests, Layer.mock for single failures
    todo-title.ts                    # pure functions
  mail/
    index.ts                         # @boberstack/core/mail
    mailer.ts                        # port Mailer
    templates/                       # pure functions from data to subject, HTML and text

packages/database/                   # adapter: the only SQL (root ADR 0003)
  src/
    index.ts                         # TodoRepositoryLayer, sqlFileMigrations
    todo.repository.ts               # provides TodoStore
    todo.repository.integration.test.ts
    testing/pg-test.ts               # Testcontainers Postgres layer (12)
  migrations/                        # NNNN_name.sql, app and better-auth tables (root ADR 0011)
packages/mail/src/                   # adapter: Mailpit provides Mailer
packages/auth/src/                   # adapter: better-auth, the authentication middleware layers
packages/capability/src/             # defineContract, implement, the projections onto each transport (root ADR 0014)
packages/client-runtime/src/         # what the apps share: api clients per context, their atoms (x.atoms.ts), clientRuntime, ApiOrigin, SessionExpiry

apps/api/src/                        # a composition root
  server.ts                          # entry point on Node (10)
  app.layer.ts                       # routes + core + adapters, no host
  capabilities/                      # one implement(...) per contract, served on every transport
    todos.capabilities.ts
  http/                              # http.layer.ts, handlers of HttpApi-only groups (health.http.ts)
  rpc/                               # rpc.layer.ts
  mcp/                               # mcp.layer.ts
apps/cli/src/                        # another composition root
apps/infra/                          # the Alchemy stacks (root ADR 0013)
  alchemy.run.ts, api.Dockerfile     # default host: the api in a container
  cloudflare.run.ts, src/worker.ts   # alternative host: the api as a Worker, Postgres through Hyperdrive
```

A small context is one module, with its files directly in the context folder. When it grows, split it into module folders (`packages/core/src/todos/sharing/`), each with its own `index.ts`. What the whole context shares sits directly in the context folder, named by what it is.

Organise by domain, not by kind. No `services/`, `helpers/`, `layers/` or `errors/` folders: the context boundaries disappear.

### structure.files: one role per file

File names are kebab-case. A plainly named file holds data or pure functions; every other file carries a role suffix with one meaning everywhere:

| File                                              | Holds                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `x.ts`                                            | data (Schemas, branded ids, records, [06](06-schema.md)) or pure functions. Never SQL or a dependency |
| `x.errors.ts`                                     | tagged `*Error` classes ([02](02-typed-errors.md))                                                    |
| `x.store.ts`                                      | a storage port `XStore` (`structure.stores`)                                                          |
| `x.service.ts`                                    | business logic, `XService`                                                                            |
| `x.repository.ts`                                 | the SQL behind one store. Only in `packages/database/src/`                                            |
| `<system>-x.ts`                                   | another adapter in `packages/<system>/src/`, named after the system it talks to                       |
| `x.layer.ts`                                      | a layer that composes others (`app.layer.ts`, `http.layer.ts`)                                        |
| `x.contracts.ts` in `packages/domain`             | a `defineContract` per operation and their projections: `HttpApiGroup`, `RpcGroup`, `Toolkit`         |
| `x.capabilities.ts` in `apps/api`                 | one `implement(contract, handler)` per contract                                                       |
| `x.http-api.ts` in `packages/domain`, `x.http.ts` | an `HttpApiGroup` with no contracts behind it (health, sign-in methods) and its handlers              |
| `index.ts`                                        | a module's or context's public surface                                                                |
| `testing/index.ts`                                | what other modules' tests may use; production code never imports it                                   |

Tests sit next to what they test. `*.test.ts` is a unit test; `*.integration.test.ts` needs Docker and runs under `pnpm test:integration`. The suffix alone decides which run picks a file up. Avoid other fixed file names (`errors.ts`, `schema.ts`): editor tabs become unreadable.

A port that is not storage is named after its job: `PasswordHasher`, `MailSender`.

### structure.imports: who may import what

| Import                                                                                                                                              | Allowed | Rule                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| a root file (`server.ts`, `app.layer.ts`, `apps/infra/src/worker.ts`, `apps/cli/src/main.ts`) → anything its `package.json` lists                   | yes     |                                                                                                                    |
| `capabilities/`, `http/`, `rpc/`, `mcp/` → `@boberstack/core/<context>`, an adapter package's index, `@boberstack/domain`, `@boberstack/capability` | yes     |                                                                                                                    |
| an adapter package → `@boberstack/core/<context>`, `@boberstack/domain`, a vendor SDK, `effect/sql`                                                 | yes     |                                                                                                                    |
| any package → a file past a core context's `index.ts`                                                                                               | no      | `exports` in `packages/core/package.json`; `@boberstack/effect/module-boundaries` (`indexOnly`) for relative paths |
| a core module → its own files, another module's or context's `index.ts`, `@boberstack/domain`                                                       | yes     |                                                                                                                    |
| a core module → a file inside another module or context                                                                                             | no      | `@boberstack/effect/module-boundaries`                                                                             |
| a core module → a root file (`app.layer.ts`, `server.ts`), tests included                                                                           | no      | `@boberstack/effect/module-boundaries` (`rootFiles`)                                                               |
| a core module → `@boberstack/auth`, `@boberstack/mail`, `better-auth`, `alchemy`, `pg`, `fetch`, `node:http`                                        | no      | `@boberstack/effect/no-domain-adapters`                                                                            |
| a core module, tests included → `effect/sql`, `@effect/sql-pg`, `@boberstack/database`, `packages/database/`; a core file named `*.repository.ts`   | no      | `@boberstack/effect/no-domain-sql`                                                                                 |
| `apps/web` → `@boberstack/core` or an adapter package                                                                                               | no      | not in `apps/web/package.json`, so pnpm cannot resolve it                                                          |
| any file outside `tools/oxlint` → `node:fs`, `node:path`, `node:child_process`, `node:timers`                                                       | no      | Effect diagnostic `nodeBuiltinImport`                                                                              |
| `packages/*` → an app                                                                                                                               | no      | review                                                                                                             |
| an app → another app's `src/`; share through a package                                                                                              | no      | review                                                                                                             |
| any file → a module that imports it back                                                                                                            | no      | `import/no-cycle`                                                                                                  |

Test code in an adapter package composes its own layers as a root does. A core unit test never touches the database or an adapter; a store's contract runs on Postgres from `packages/database/src/x.repository.integration.test.ts`.

```ts
// bad: a deep import across a context boundary
import { CurrentUser } from "../identity/current-user.ts";
// another context: only through its index
import { CurrentUser } from "../identity/index.ts";
// inside todos/: import sibling files directly
import { normalizeTitle } from "./todo-title.ts";
```

Test helpers never go in a module's `index.ts`. Production code loads that index, so anything it exports ships in every root that imports the context. A module that shares test helpers gives them their own `testing/index.ts`.

### structure.adapters: ports in core, each adapter in its own package, the root chooses

A module owns the port: the service tag, its API and its typed errors. Code that talks to an external system implements that port in its own package, `packages/<system>/`, which depends on `@boberstack/core` and never the other way round. An adapter exports a layer for the module's tag and defines no tag of its own. It performs the I/O, decodes the response at the boundary and maps a transport failure into the module's typed error. The rules stay in the module.

A value a module needs from the deployment is a port too, named after what the module does with it (`TrustedOrigins`, not `Env`). Its `layerConfig` lives in the adapter package, and only composition roots use it ([07](07-configuration.md)).

A new adapter package needs no lint config change: the Effect rules cover every `packages/*`, its service ids take `boberstack/<package>` from the folder name, and core may import no `@boberstack/*` package but `@boberstack/domain`.

### structure.stores: a store port in the module, its SQL in a repository

A module that keeps state asks for it through `XStore` in `x.store.ts`. The adapter is `XRepository` in `packages/database/src/x.repository.ts`: `{ layer: Layer.effect(XStore, …) }`. It takes `SqlClient`, runs the queries, decodes each row with Schema and maps a `SqlError` or `SchemaError` to the module's storage error.

A table is named in the plural (`todos`, `users`), and so are the `modelName`s better-auth gets for its tables. `packages/database/src/migrations.integration.test.ts` fails on a singular table name.

```ts
// packages/core/src/todos/todo.store.ts
export interface TodoStoreApi {
  readonly listByOwner: (owner: UserId) => Effect.Effect<ReadonlyArray<Todo>, TodoStorageError>;
  readonly insert: (todo: Todo, owner: UserId) => Effect.Effect<void, TodoStorageError>;
}

export class TodoStore extends Context.Service<TodoStore, TodoStoreApi>()(
  "boberstack/core/todos/TodoStore",
) {}

// packages/database/src/todo.repository.ts
export const TodoRepository = {
  layer: Layer.effect(
    TodoStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const findByOwner = SqlSchema.findAll({
        Request: UserId,
        Result: TodoRow,
        execute: (owner) => sql`SELECT * FROM todos WHERE owner_id = ${owner} ORDER BY created_at`,
      });
      return TodoStore.of({
        listByOwner: (owner) =>
          findByOwner(owner).pipe(
            Effect.mapError((cause) => new TodoStorageError({ operation: "listByOwner", cause })),
          ),
        // insert …
      });
    }),
  ),
};
```

- **A store has one implementation.** No `layerTest` or `inMemory` on a `*Store` (`@boberstack/effect/no-store-fakes`). Its repository runs the store's contract on Postgres. Why: root ADR 0003.
- **Test each behaviour where it can be observed.** Rows, ordering, constraints and races: the repository's integration suite. A pure decision: a unit test of the pure function. A failure Postgres cannot produce on demand: `Layer.mock(XStore, { oneOp: … })` for that one operation in a service test.
- **An operation is named after its job** (`listByOwner`, `markDone`), not after tables or queries.
- **What lands together is one operation.** A service never splits one transaction across two store calls.
- **A write its constraint decides needs no transaction.** `INSERT … ON CONFLICT DO NOTHING RETURNING`, then a read of the row that won; the contract has the race case.
- **No span on an adapter.** The service's `Effect.fn` is the traced unit ([08](08-observability.md)).
- **The root provides stores, once.** A module's `layer` leaves the store open; `app.layer.ts` and the integration tests provide the repository.
- **The index exports what an adapter needs**: the tag, the request and answer types and the error classes it constructs, nothing test-only.

### structure.ids: the service id mirrors the path

The id is the package's import path without the `@`, then the path below `src`, then the class: `@boberstack/core/todos` holds `boberstack/core/todos/TodosService` (`@boberstack/effect/service-id-matches-path`, which can autofix it):

| Source root              | Id prefix               | Example                                  |
| ------------------------ | ----------------------- | ---------------------------------------- |
| `packages/core/src`      | `boberstack/core/`      | `boberstack/core/todos/TodosService`     |
| `packages/<adapter>/src` | `boberstack/<adapter>/` | `boberstack/auth/Auth`                   |
| `packages/domain/src`    | `boberstack/domain/`    | `boberstack/domain/identity/CurrentUser` |

`scripts/init.mjs` renames the `boberstack` prefix with the project.

### structure.web: the browser app

```
apps/web/src/
  main.tsx                 # entry: the root RegistryProvider seeded from runtime.ts, then the router
  runtime.ts               # the client layer the atoms run on (10)
  app/router.tsx           # React Router data routes; private routes get their own registry
  features/<name>/
    api/                   # small hooks over shared atoms, when a component needs a derived value
    components/
    forms/                 # React Hook Form + effectTsResolver over a packages/domain Schema
  shared/
```

A feature imports the contract from `@boberstack/domain`, the atoms from `@boberstack/client-runtime/<context>` and UI from `@boberstack/ui`, never from `@boberstack/core`, an adapter package or `apps/api`. `runtime.ts` builds the client layer from `FetchHttpClient.layer` and `ApiOrigin.layer(globalThis.location.origin)` and seeds `clientLayer` with it. Components never build requests or run Effects; they read atoms with `useAtomValue`, `useAtom` and `useAtomRefresh` and match on the `AsyncResult` (root ADR 0010).

Source for the id convention: `effect/AGENTS.md` (Context.Service: "include the package name and the subdirectory path"). The rest is house convention.
