# Client state lives in Effect atoms from `packages/client-runtime`

**Status:** accepted, 2026-11-08.

The web and mobile apps read the same data from the same api, and React does not run Effect. A data-fetching library that works through Promises would leave Effect at every call: a typed failure would reach the component as a squashed `Error` it cannot match on, cancellation would need a second mechanism, and each app would keep its own copy of the hooks, because hooks cannot move into a package without React.

Client state is Effect atoms (`effect/reactivity`, with `@effect/atom-react` for the hooks). The atoms live in `packages/client-runtime` next to the clients they call (`todos`, `createTodo`, `updateTodo`, `removeTodo`, `signInMethods`) and import no React. They run on `clientRuntime`, an atom runtime whose layer comes from the `clientLayer` atom, and each app seeds that atom in its `AtomRegistry` with its own client layer: the browser's `fetch` on `location.origin` and the transport from `VITE_TODOS_TRANSPORT` on the web, the session-cookie `fetch` on `EXPO_PUBLIC_API_URL` on mobile. This delivers four things:

- **One stack.** Every request runs as a fiber on the Effect runtime. No `runPromise`, no Promise wrapper.
- **Dependency injection.** Atoms get their services from layers. A test seeds a registry with a stub client or a stub `HttpClient` and renders the real screen.
- **No lost errors.** A component reads an `AsyncResult` that keeps the full `Cause` and matches on `UnauthorizedError`, `TodosUnavailableError` and `TodoNotFoundError`.
- **Interruption.** An atom's fiber lives as long as something reads the atom. Leaving a screen, refreshing or disposing the registry interrupts it, and the HTTP client aborts the request.

Mutations invalidate reads with reactivity keys (`reactivityKeys: ["todos"]` on the function atom, `Atom.withReactivity(["todos"])` on the list) so a write refreshes every read of the same data. Session expiry is a `SessionExpiry` service: both todos clients report an `UnauthorizedError` to it, it counts the refusal in the registry's `sessionExpiries` atom, and each app reacts through `onSessionExpired`, whichever screen made the call. The signed-in part of each app (the web's private routes, the mobile Todos screen) gets its own `RegistryProvider`, seeded with the same client layer. Signing out or an expired session unmounts it, which disposes the registry, so the cached data goes and running fibers are interrupted; nothing has to remember to clear a cache.

The atoms are shared; the React hooks that read them come from `@effect/atom-react` and stay in each app with the UI. The browser enters Effect through the atom runtime (root ADR 0002).

## Consequences

- `effect/reactivity` and `@effect/atom-react` are marked unstable in Effect 4.0.7. Both are on the `allowedUnstableApis` list in `tsconfig.base.json`, and an Effect upgrade has to check their changes.
- A new screen's data is an atom in `packages/client-runtime/src/<context>/x.atoms.ts`. Its React code reads it with `useAtomValue`, `useAtom` or `useAtomRefresh`.
- The web todos page renders the `AsyncResult` states instead of suspending in a route loader. A loader runs outside React and cannot reach the signed-in registry, and a suspended transition never commits, so leaving it could not interrupt the request. The card's frame shows at once and the list fills in.
- A test of a screen seeds `clientLayer` in a `RegistryProvider` with stub layers; `apps/web/src/app/session-expiry.test.tsx` and `apps/mobile/src/app/session-expiry.test.ts` do it with a stub `HttpClient`.
- `@tanstack/react-query` is refused in `apps/**` and `packages/**` by `no-restricted-imports` in `tools/oxlint/lint.config.ts`.
- Each mobile screen that needs the session's atoms wraps itself in `SessionAtoms` (the Todos screen does it through `layout`). When two signed-in screens need to share cached data, move the provider up to wrap both.

## Considered options

- TanStack React Query: fetching stays outside the Effect runtime, failures arrive squashed, and each app keeps its own hooks.
- React Query hooks shared in a package: one copy of the hooks, but the package then needs React and each app's React copy, and errors and cancellation still go through Promises.
