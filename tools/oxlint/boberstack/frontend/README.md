# frontend

Oxlint JS plugin with one rule, `@boberstack/frontend/feature-boundaries`, on for `apps/web`. It keeps the SPA's imports pointing one way, so a feature can be changed or deleted without touching the others.

```
apps/web/src/
  shared/      may import: shared, packages, libraries
  features/    may import: shared, its own files, another feature's index.ts
  app/         may import: features (through their index.ts), shared
  main.tsx and test/ sit outside the layers; they still reach a feature through its index.ts
  runtime.ts is the composition root: it may import a feature's adapters (api/*-client.ts) directly
```

| Flags                                                                                                                 | Message id |
| --------------------------------------------------------------------------------------------------------------------- | ---------- |
| an import that points up the order `shared → features → app` (shared importing a feature, a feature importing `app/`) | `upward`   |
| an import of a file inside another feature, from anywhere outside it (another feature, `app/`, `main.tsx`)            | `feature`  |

Each feature exports what others may use from `features/<name>/index.ts`. Everything else in the folder is private. If two features need the same thing, it moves down to `shared/` or into `packages/ui`.

Options (defaults match this starter): `featuresRoot` (`apps/web/src/features`), `layers`, bottom to top (`apps/web/src/shared`, `apps/web/src/features`, `apps/web/src/app`), and `roots`, the composition roots that wire adapters into the runtime (`apps/web/src/runtime.ts`). Going through the index from `runtime.ts` would make a cycle: the feature's queries import `runPromise` from the runtime. Only relative specifiers are checked; package imports such as `@boberstack/ui/...` are never flagged.

This is the frontend counterpart of `@boberstack/effect/module-boundaries`, which fences bounded contexts in `apps/api`. It is a separate rule because a feature's subfolders (`api/`, `components/`, `forms/`) are layers of one feature, not modules with their own index.
