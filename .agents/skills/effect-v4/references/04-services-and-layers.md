# 04 · Services and layers

Dependency injection is where Effect shapes the code most. A service is a named contract. A layer is one way of building it.

## Rules

### services.define: declare the API, build it in `make`

A service is a class extending `Context.Service<Self, Api>()(id, { make })`. The API type comes first, so the contract is readable at the top of the file and an implementation cannot widen its error type (`@boberstack/effect/service-explicit-shape`). `make` captures every dependency once, so the methods themselves require nothing. Methods are `Effect.fn` ([08](08-observability.md)).

```ts
// apps/api/src/modules/todos/todo.service.ts
export interface TodosServiceApi {
  readonly list: (owner: UserId) => Effect.Effect<ReadonlyArray<Todo>, TodoStorageError>;
  readonly create: (owner: UserId, input: NewTodo) => Effect.Effect<Todo, TodoStorageError>;
  readonly update: (
    owner: UserId,
    id: TodoId,
    patch: TodoPatch,
  ) => Effect.Effect<Todo, TodoNotFoundError | TodoStorageError>;
}

export class TodosService extends Context.Service<TodosService, TodosServiceApi>()(
  "boberstack/todos/TodosService",
  {
    make: Effect.gen(function* () {
      const store = yield* TodoStore;

      const list = Effect.fn("TodosService.list")(function* (owner: UserId) {
        return yield* store.listByOwner(owner);
      });

      // create, update …

      return { list, create, update };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make);
}
```

Name an API type `XxxApi`. The word "shape" is banned in symbol names (`anti-slop/no-shape-in-symbol-names`).

Consumers write `const todos = yield* TodosService`. v4 has no accessors (`TodosService.list(…)` as a static) and no `Effect.Service` with a generated `.Default`.

### services.purity: a dependency makes it a service

Anything that needs a store, the database, the network or secure randomness is a service method. Clock and Random are default services ([01](01-default-services.md)), so code that reads them is Effect code but needs no layer. A module-level function is pure: same input, same output, no `yield*`. Pure functions live in a plainly named file (`todo-title.ts`) and get unit or property tests without layers.

### services.layerNames: `layer` plus a descriptive suffix

| Name                  | Meaning                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Service.layer`       | the primary layer: service dependencies wired, infrastructure left open                                                              |
| `Service.layerNoDeps` | every requirement left open; exists only when `layer` wires another service, for tests to mock that one                              |
| `Service.layerConfig` | reads `Config`; only composition roots use it ([07](07-configuration.md))                                                            |
| `Service.layerTest`   | a shared test implementation, only when several test files need it, never on a `*Store` ([12](12-test-layers-and-infrastructure.md)) |

Never `Live`, `Default` or `FooLive` (`@boberstack/effect/layer-naming`).

### services.wiring: `layer` wires services, not infrastructure

`Service.layer` provides the services it depends on and leaves infrastructure open: stores, `SqlClient`, `Crypto`, HTTP clients. The composition root provides infrastructure exactly once.

```ts
// a service that uses another service
static readonly layerNoDeps = Layer.effect(this, this.make);
static readonly layer = this.layerNoDeps.pipe(Layer.provide(TodoTitlePolicy.layer));

// apps/api/src/app.layer.ts: the composition root
export const AppLayer = Layer.mergeAll(HttpLayer, RpcLayer).pipe(
  Layer.provide(TodosService.layer),
  Layer.provide(TodoRepository.layer),
  Layer.provide(DatabaseLayer),
  Layer.provide(WebCryptoLayer),
);
```

Why: `.layer` never reads the environment, so an integration test can use it with a Testcontainers database. Layers are memoized by reference, so one `DatabaseLayer` gives every repository the same client.

### services.platform: the machine is infrastructure too

A domain module never imports `node:fs`, `node:os` or `node:child_process` as values (`@boberstack/effect/no-platform-imports`), nor a vendor SDK, `fetch` or anything in `platform/` (`@boberstack/effect/no-domain-adapters`). The api runs on Workers, where most of those do not exist anyway. On Node (`apps/cli`), a service captures Effect's `FileSystem`, `Path` or `ChildProcessSpawner` in `make`, and `main.ts` provides `NodeServices.layer` from `@effect/platform-node` once.

### Resources inside layers

`Layer.scoped` merged into `Layer.effect`: `Effect.acquireRelease` works directly in `make`, and the release runs when the layer's scope closes. See [09](09-concurrency-and-resources.md).

Source: `effect/AGENTS.md` (Writing Effect services), `effect/src/Context.ts` (`Service`, `make`), `Layer.ts`, `ai-docs/src/01_effect/03_services/`.
