# 06 · Schema

Schema turns untrusted input into trusted data, and it lets the api, the web app and the CLI agree on a type without copying it. Import it from `effect`: `import { Schema } from "effect"`. `@effect/schema` is gone.

## Rules

### schema.records: domain records are `Schema.Class`

An instance cannot exist unvalidated: `new` validates and throws on bad input. Updates go through `new`, so they are validated again. Brand the class like an error ([02](02-typed-errors.md)), so two records with the same fields stay distinct types.

```ts
// packages/domain/src/todos/todo.ts
export class Todo extends Schema.Class<Todo, { readonly brand: unique symbol }>("Todo")({
  id: TodoId,
  title: TodoTitle,
  completed: Schema.Boolean,
  createdAt: Schema.DateTimeUtcFromString,
}) {}

const done = new Todo({ ...todo, completed: true });
```

A `Schema.Class` is for a record the domain names (a `GLOSSARY.md` term) or one that carries an invariant its fields alone do not. A `Schema.Struct` is for a type defined by its use: a request, a patch, a DB row, a config group. A class is not nominal without the brand: a plain object with the same fields type-checks as an instance.

### schema.construction: build a value where its failure belongs

At a boundary, decode with `Schema.decodeUnknownEffect(X)(input)` and map the `SchemaError` to the module's error. Inside, where the input is already typed, use `X.make(fields)` or `new X(fields)`; both throw, so use them only where a failure is a defect. `X.makeEffect(fields)` keeps the failure in the error channel as a `SchemaIssue.Issue`.

`Schema.Number` accepts `NaN` and `Schema.String` accepts `""`. Decode with `Schema.Finite`, `Schema.NonEmptyString`, `Schema.DateTimeUtcFromString` and friends, which refuse them, and never convert by hand before the decode.

### schema.unions: an answer with several cases is a `Schema.TaggedUnion`

Build a case with `X.cases.<Tag>.make(fields)` and branch with the union's own `X.match(value, { … })`, which fails to compile when a case is missing. Writing `_tag` by hand is refused by `anti-slop-effect/no-manual-tagged-construction`, comparing it by `anti-slop-effect/no-manual-tag-comparison`.

```ts
export const SignInOutcome = Schema.TaggedUnion({
  SignedIn: { user: User },
  NeedsVerification: { email: Schema.String },
});

SignInOutcome.match(outcome, {
  SignedIn: ({ user }) => navigateHome(user),
  NeedsVerification: ({ email }) => showVerifyNotice(email),
});
```

### schema.ids: every identifier is branded

A field named `*Id` is a branded schema, never a plain `Schema.String` or `Schema.Number` (`effect/branded-ids`).

```ts
export const TodoId = Schema.String.pipe(Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

todos.update(owner, user.id, patch); // compile error: UserId is not a TodoId
```

### schema.decode: decode at the boundary, trust types inside

Input from outside the process (HTTP bodies, RPC payloads, DB rows, `localStorage`, env) is decoded once, at the boundary, with `Schema.decodeUnknownEffect`. HttpApi and RPC decode payloads and encode answers for you from the contract. Internal code trusts types and never validates again.

```ts
// good
const row = yield * Schema.decodeUnknownEffect(TodoRow)(raw);
const parsed = yield * Schema.decodeUnknownEffect(Schema.fromJsonString(TodoRow))(text);

// bad: lies to the compiler, and a bad value fails far from the cause
const row = JSON.parse(text) as TodoRow;

// bad: throws, so the failure becomes a defect
const row = Schema.decodeUnknownSync(TodoRow)(raw);
```

`decodeUnknownSync`, `decodeSync` and `decodeUnknownPromise` are allowed only in scripts and tests (`effect/no-decode-sync`). A type assertion needs a `// SAFETY:` comment naming the invariant (`anti-slop/require-safety-comment-for-type-assertion`); getting around a type is never one.

### schema.sharing: a contract that crosses an app boundary lives in `packages/domain`

Records, ids, wire errors, the `HttpApi`, every `HttpApiGroup` and `RpcGroup`, and the auth middleware tags live in `packages/domain`. The api implements them, the web app and the CLI call them, and all three validate with the same definition. `packages/domain` imports only `effect`. Why: root ADR 0007.

### schema.forms: a form validates with the contract's schema

A React Hook Form form uses the same schema the endpoint decodes, through `effectTsResolver` from `@hookform/resolvers/effect-ts`. The client and the server cannot disagree about what a valid todo title is.

```tsx
const form = useForm({ resolver: effectTsResolver(NewTodo) });
```

## v4 names

| v3                    | v4                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------ |
| `decodeUnknown`       | `decodeUnknownEffect`                                                                |
| `decodeUnknownEither` | `decodeUnknownExit`                                                                  |
| `Schema.transform`    | `from.pipe(Schema.decodeTo(to, SchemaTransformation.transform({ decode, encode })))` |
| `parseJson`           | `Schema.fromJsonString`                                                              |
| `Union(A, B)`         | `Union([A, B])`                                                                      |
| `Literal("a", "b")`   | `Literals(["a", "b"])`                                                               |

Source: `effect/AGENTS.md` (Defining schemas), `ai-docs/src/01_effect/02_schema/`, `effect/src/Schema.ts`.
