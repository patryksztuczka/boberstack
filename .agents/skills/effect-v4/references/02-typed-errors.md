# 02 · Typed errors

The E channel is how a function says what can go wrong. When every expected failure is a named, tagged value, a caller can recover from it by tag, the HTTP and RPC layers encode it, and a log line says what happened without a stack trace.

## Rules

### errors.base: domain errors are `Schema.TaggedError`

Every domain error extends `Schema.TaggedError`. It is yieldable, a handler catches it by tag, and it encodes over HTTP and RPC with the same schema. Nothing extends `Error` or another built-in error class, tests included (`effect/no-error-subclass`).

Pass `{ readonly brand: unique symbol }` as the second type argument. Two error classes with the same fields are otherwise assignable to each other, and the compiler would let one stand in for the other.

```ts
// packages/domain/src/todos/todo.errors.ts
export class TodoNotFoundError extends Schema.TaggedError<
  TodoNotFoundError,
  { readonly brand: unique symbol }
>()("TodoNotFoundError", { id: TodoId }, { httpApiStatus: 404 }) {}

// in an Effect.gen / Effect.fn body: always `return yield*`
return yield * new TodoNotFoundError({ id });
```

### errors.home: an error lives in a `*.errors.ts` file

An error that crosses the wire (an HttpApi endpoint's or an Rpc's `error`) lives in `packages/domain/src/<context>/<x>.errors.ts`, beside the contract that names it. An error only the server sees, such as a store's storage failure, lives in the module's `x.errors.ts` under `apps/api/src/modules/<context>/`. `effect/tagged-error-naming` refuses an error class anywhere else.

### errors.naming: the name ends in `Error` and equals the tag

```ts
// good
class TodoNotFoundError extends Schema.TaggedError<
  TodoNotFoundError,
  { readonly brand: unique symbol }
>()("TodoNotFoundError", { id: TodoId }) {}

// bad: missing suffix, and the tag differs from the class name
class TodoNotFound extends Schema.TaggedError<TodoNotFound>()("NotFound", { id: TodoId }) {}
```

### errors.granularity: one class per failure, one union per module

```ts
// good
export type TodosServiceError = TodoNotFoundError | TodoStorageError;

// bad: callers match on message strings
class AppError extends Schema.TaggedError<AppError>()("AppError", { message: Schema.String }) {}
```

### errors.context: name the failure, keep its source, say how to fix it

An error carries the fields a reader needs to act without opening a debugger: what was refused, the input or id that caused it, and, for a failure a person can fix, what to do. Translate a lower-level failure into the module's error at the boundary where it happens, and keep its cause in a `Schema.Defect()` field.

```ts
export class TodoStorageError extends Schema.TaggedError<
  TodoStorageError,
  { readonly brand: unique symbol }
>()("TodoStorageError", { operation: Schema.String, cause: Schema.Defect() }) {}

// platform/database/todo.repository.ts
insert(row).pipe(Effect.mapError((cause) => new TodoStorageError({ operation: "insert", cause })));
```

An error a person reads, such as a CLI failure, overrides `message` to say what went wrong and how to fix it, and may set `Runtime.errorExitCode` so `runMain` exits with a deliberate code:

```ts
export class MigrationFailedError extends Schema.TaggedError<
  MigrationFailedError,
  { readonly brand: unique symbol }
>()("MigrationFailedError", { file: Schema.String, cause: Schema.Defect() }) {
  override readonly [Runtime.errorExitCode] = 2;

  override get message(): string {
    return `Migration ${this.file} failed. Fix the SQL, then run \`cli db migrate\` again.`;
  }
}
```

### errors.http: the status code lives in the contract

An error that an HttpApi endpoint returns declares its status as the third argument, `{ httpApiStatus: 404 }`. The handler fails with the error; it never builds a response by hand. An undeclared failure reaching the HTTP layer is a 500 and a bug.

### errors.defects: failures versus defects

- A failure is anything a caller could react to. It goes in E as a typed error.
- A defect is a broken invariant, meaning a bug. Use `Effect.orDie` or `Effect.die`. Defects are not retried and do not appear in the type.
- `Effect.try` and `Effect.tryPromise` always map the thrown value to one typed error in `catch` (`effect/try-requires-catch`). The `catch` never checks whether the cause is already one of ours: that turns a bug in our code into an expected failure. The `try` thunk only calls the foreign code.
- Never `throw` inside Effect code (`effect/no-throw-in-effect`), and never `Effect.fail("…")` or `Effect.fail(new Error(…))` (`effect/no-untyped-failure`).

```ts
const session =
  yield *
  Effect.tryPromise({
    try: () => auth.api.getSession({ headers }),
    catch: () => new AuthenticationUnavailableError({}),
  });

// cannot happen unless we have a bug
const header = yield * parseHeader(bytes).pipe(Effect.orDie);
```

`Effect.orDie` hides a failure. Use it only where the failure really is impossible, never to make a type check pass.

### errors.values: nothing throws

A plain function that can refuse returns a `Result`; it never throws. Effect code takes the refusal with `Effect.fromResult`.

`Result.getOrThrow` and `Option.getOrThrow` are a throw too. In Effect code take the value with `Effect.fromResult` or `Effect.fromOption`; in pure code with `Result.match`, `Option.match` or `getOrElse`. Only a test may use them, to assert on a value.

```ts
// good: the refusal is in the signature
export const parseLimit = (raw: string): Result.Result<number, InvalidLimitError> => {
  const limit = Number(raw);
  return Number.isInteger(limit) && limit > 0
    ? Result.succeed(limit)
    : Result.fail(new InvalidLimitError({ raw }));
};

const limit = yield * Effect.fromResult(parseLimit(query.limit));
```

## Handling errors

```ts
effect.pipe(
  Effect.catchTag("TodoNotFoundError", () => Effect.succeed(Option.none())),
  Effect.catchTag(["UnauthorizedError", "AuthenticationUnavailableError"], () => signIn),
  Effect.catchTags({ TodoStorageError: (error) => Effect.die(error) }),
);
```

Recover by tag, never by class: no `instanceof …Error` (`effect/no-error-instanceof`) and no hand-written `_tag` checks (`anti-slop-effect/no-manual-effect-error-tag`, `no-manual-tag-comparison`). Outside `catchTag`, test a value with `Predicate.isTagged(value, "TodoNotFoundError")` or `Schema.is(TodoNotFoundError)`.

A fallback is right only when its value is a valid domain answer. Turning a storage failure into an empty list hides an outage; keep refusal, defect and success distinct.

v4 renamed `catchAll` to `Effect.catch`, `catchAllCause` to `Effect.catchCause` and `catchSome` to `Effect.catchFilter`. `Cause` is flat: iterate `cause.reasons`.

Source: `effect/AGENTS.md` (Error handling), `ai-docs/src/01_effect/04_errors/`, `Schema.ts` (`TaggedError`), `Runtime.ts` (`errorExitCode`), `http-api/HttpApiSchema.ts` (`httpApiStatus`).
