# 05 · Project structure

A bounded context is a folder. A file's name says what role it plays: a record, an error, a port, the logic or the SQL. SQL lives in one place, `platform/database/`, and a domain module reaches it only through a store port. Why: root ADR 0004. The contexts themselves are in [`CONTEXT-MAP.md`](../../../../CONTEXT-MAP.md).

## Rules

### structure.tree: the tree

```
packages/domain/src/                 # the contract both sides import (06, schema.sharing)
  api.ts                             # HttpApi: every group
  system/health.http-api.ts
  todos/
    todo.ts                          # Todo, TodoId, TodoTitle, NewTodo, TodoPatch
    todo.errors.ts                   # errors that cross the wire, with httpApiStatus
    todos.http-api.ts                # HttpApiGroup
    todos.rpc.ts                     # RpcGroup
  identity/
    user.ts, current-user.ts         # User, UserId, the CurrentUser service tag
    authentication.ts                # HttpApi and RPC middleware tags
    authentication.errors.ts

apps/api/src/
  worker.ts                          # entry point and composition root (10)
  app.layer.ts                       # composition root: routes + modules + platform
  http/                              # one handler file per HttpApi group, http.layer.ts
    todos.http.ts
  rpc/                               # RPC handlers, rpc.layer.ts
    todos.rpc.ts
  modules/                           # bounded contexts
    todos/
      index.ts                       # the context's public surface
      todo.store.ts                  # port TodoStore
      todo.service.ts                # TodosService
      todo.service.test.ts           # unit tests, Layer.mock for single failures
      todo-title.ts                  # pure functions
  platform/                          # adapters, one folder per capability
    database/                        # the only SQL
      todo.repository.ts             # provides TodoStore
      todo.repository.integration.test.ts
    authentication/                  # better-auth and the middleware layers
  testing/
    pg-test.ts                       # Testcontainers Postgres layer (12)
apps/api/migrations/                 # NNNN_name.sql, app and better-auth tables (root ADR 0006)
```

A small context is one module, with its files directly in the context folder. When it grows, split it into module folders (`modules/todos/sharing/`), each with its own `index.ts`. What the whole context shares sits directly in the context folder, named by what it is.

Organise by domain, not by kind. No `services/`, `helpers/`, `layers/` or `errors/` folders: the context boundaries disappear.

### structure.files: one role per file

File names are kebab-case. A plainly named file holds data or pure functions; every other file carries a role suffix with one meaning everywhere:

| File                                             | Holds                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `x.ts`                                           | data (Schemas, branded ids, records, [06](06-schema.md)) or pure functions. Never SQL or a dependency |
| `x.errors.ts`                                    | tagged `*Error` classes ([02](02-typed-errors.md))                                                    |
| `x.store.ts`                                     | a storage port `XStore` (`structure.stores`)                                                          |
| `x.service.ts`                                   | business logic, `XService`                                                                            |
| `x.repository.ts`                                | the SQL behind one store. Only in `platform/database/`                                                |
| `<system>-x.ts`                                  | another adapter in `platform/<capability>/`, named after the system it talks to                       |
| `x.layer.ts`                                     | a layer that composes others (`app.layer.ts`, `http.layer.ts`)                                        |
| `x.http.ts`, `x.rpc.ts`                          | HttpApi group handlers, RPC handlers                                                                  |
| `x.http-api.ts`, `x.rpc.ts` in `packages/domain` | the contract: `HttpApiGroup`, `RpcGroup`                                                              |
| `index.ts`                                       | a module's or context's public surface                                                                |
| `testing/index.ts`                               | what other modules' tests may use; production code never imports it                                   |

Tests sit next to what they test. `*.test.ts` is a unit test; `*.integration.test.ts` needs Docker and runs under `pnpm test:integration`. The suffix alone decides which run picks a file up. Avoid other fixed file names (`errors.ts`, `schema.ts`): editor tabs become unreadable.

A port that is not storage is named after its job: `PasswordHasher`, `MailSender`.

### structure.imports: who may import what

| Import                                                                                                                            | Allowed | Rule                                     |
| --------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------- |
| a root file (`worker.ts`, `app.layer.ts`) → anything                                                                              | yes     |                                          |
| `http/`, `rpc/` → a context's `index.ts`, `@boberstack/domain`                                                                    | yes     |                                          |
| `platform/` → a context's or module's `index.ts`, a vendor SDK, `effect/sql`                                                      | yes     |                                          |
| `platform/` → a file inside a module                                                                                              | no      | `effect/module-boundaries` (`indexOnly`) |
| a module → its own files, another module's or context's `index.ts`, `@boberstack/domain`                                          | yes     |                                          |
| a module → a file inside another module or context                                                                                | no      | `effect/module-boundaries`               |
| a module → a root file (`app.layer.ts`, `worker.ts`), tests included                                                              | no      | `effect/module-boundaries` (`rootFiles`) |
| a module → `platform/`, `better-auth`, `alchemy`, `pg`, `fetch`, `node:http`                                                      | no      | `effect/no-domain-adapters`              |
| a module, tests included → `effect/sql`, `@effect/sql-pg`, `platform/database/`, `pg-test`; a module file named `*.repository.ts` | no      | `effect/no-domain-sql`                   |
| a module → `node:fs`, `node:os`, `node:child_process` as values                                                                   | no      | `effect/no-platform-imports`             |
| `packages/*` → an app                                                                                                             | no      | review                                   |
| an app → another app's `src/`; share through `packages/domain`                                                                    | no      | review                                   |
| any file → a module that imports it back                                                                                          | no      | `import/no-cycle`                        |

Test code (`*.test.ts`, `testing/`) may import `platform/` except the database, because a test composes its own layers as a root does. A unit test never touches the database; a store's contract runs on Postgres from `platform/database/x.repository.integration.test.ts`.

```ts
// bad: a deep import across a context boundary
import { CurrentUser } from "../identity/current-user.ts";
// another context: only through its index
import { CurrentUser } from "../identity/index.ts";
// inside todos/: import sibling files directly
import { normalizeTitle } from "./todo-title.ts";
```

Test helpers never go in a module's `index.ts`. Production code loads that index, so anything it exports ships in the Worker bundle. A module that shares test helpers gives them their own `testing/index.ts`.

### structure.adapters: ports in the module, adapters in `platform/`, the root chooses

A module owns the port: the service tag, its API and its typed errors. Code that talks to an external system implements that port in `apps/api/src/platform/<capability>/`. An adapter exports a layer for the module's tag and defines no tag of its own. It performs the I/O, decodes the response at the boundary and maps a transport failure into the module's typed error. The rules stay in the module.

A value a module needs from the deployment is a port too, named after what the module does with it (`TrustedOrigins`, not `Env`). Its `layerConfig` lives in `platform/`, and only composition roots use it ([07](07-configuration.md)).

### structure.stores: a store port in the module, its SQL in a repository

A module that keeps state asks for it through `XStore` in `x.store.ts`. The adapter is `XRepository` in `platform/database/x.repository.ts`: `{ layer: Layer.effect(XStore, …) }`. It takes `SqlClient`, runs the queries, decodes each row with Schema and maps a `SqlError` or `SchemaError` to the module's storage error.

```ts
// apps/api/src/modules/todos/todo.store.ts
export interface TodoStoreApi {
  readonly listByOwner: (owner: UserId) => Effect.Effect<ReadonlyArray<Todo>, TodoStorageError>;
  readonly insert: (todo: Todo, owner: UserId) => Effect.Effect<void, TodoStorageError>;
}

export class TodoStore extends Context.Service<TodoStore, TodoStoreApi>()(
  "boberstack/todos/TodoStore",
) {}

// apps/api/src/platform/database/todo.repository.ts
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

- **A store has one implementation.** No `layerTest` or `inMemory` on a `*Store` (`effect/no-store-fakes`). Its repository runs the store's contract on Postgres. Why: root ADR 0004.
- **Test each behaviour where it can be observed.** Rows, ordering, constraints and races: the repository's integration suite. A pure decision: a unit test of the pure function. A failure Postgres cannot produce on demand: `Layer.mock(XStore, { oneOp: … })` for that one operation in a service test.
- **An operation is named after its job** (`listByOwner`, `markDone`), not after tables or queries.
- **What lands together is one operation.** A service never splits one transaction across two store calls.
- **A write its constraint decides needs no transaction.** `INSERT … ON CONFLICT DO NOTHING RETURNING`, then a read of the row that won; the contract has the race case.
- **No span on an adapter.** The service's `Effect.fn` is the traced unit ([08](08-observability.md)).
- **The root provides stores, once.** A module's `layer` leaves the store open; `app.layer.ts` and the integration tests provide the repository.
- **The index exports what an adapter needs**: the tag, the request and answer types and the error classes it constructs, nothing test-only.

### structure.ids: the service id mirrors the path

The id is `boberstack/<path under the source root>/<Class>` (`effect/service-id-matches-path`, which can autofix it):

| Source root           | Id prefix              | Example                                  |
| --------------------- | ---------------------- | ---------------------------------------- |
| `apps/*/src/modules`  | `boberstack/`          | `boberstack/todos/TodosService`          |
| `apps/*/src/platform` | `boberstack/platform/` | `boberstack/platform/database/<Class>`   |
| `packages/domain/src` | `boberstack/domain/`   | `boberstack/domain/identity/CurrentUser` |

`scripts/init.mjs` renames the `boberstack` prefix with the project.

### structure.web: the browser app

```
apps/web/src/
  main.tsx                 # entry: renders the router
  runtime.ts               # the one ManagedRuntime (10)
  router.tsx               # React Router data routes
  features/<name>/
    api/                   # TanStack Query hooks; each calls runtime.runPromise on a typed client call
    components/
    forms/                 # React Hook Form + effectTsResolver over a packages/domain Schema
  shared/
```

A feature imports the contract from `@boberstack/domain` and UI from `@boberstack/ui`, never from `apps/api`. Components never build requests; they call the feature's hooks.

Source for the id convention: `effect/AGENTS.md` (Context.Service: "include the package name and the subdirectory path"). The rest is house convention.
