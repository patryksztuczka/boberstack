# Todos

## What exists

A signed-in user's own list at `/todos`: add, mark done, remove, and a "N todos left" counter. The page talks to the api over HttpApi by default and over RPC when the web app runs with `VITE_TODOS_TRANSPORT=rpc`. The card's subtitle says which one ("Talking to the API over HttpApi.").

Code: `apps/web/src/features/todos/`, contracts in `packages/domain/src/todos/todos.contracts.ts`, one handler per contract for both transports in `apps/api/src/capabilities/todos.capabilities.ts`, logic in `packages/core/src/todos/`, SQL in `packages/database/src/todo.repository.ts`.

## How to reach it

Sign in as `demo@example.com` / `demo12345` (the doctor creates the user). `/` and a successful sign-in both land on `/todos`. Signed out, `/todos` redirects to `/sign-in`.

For the RPC transport, stop dev and start it again with `VITE_TODOS_TRANSPORT=rpc pnpm dev`. The subtitle must then say RPC.

## Drive

1. Note the counter. Add a todo with spaces around the title, for example `  First run  `. It appears trimmed as `First run`, the input is empty again, the counter goes up by one.
2. Add a second todo right away, without reloading. It must appear too.
3. Submit an empty or whitespace-only title. Nothing is added and the field shows the "1 to 200 characters" error.
4. Tick the first todo. The title gets struck through and the counter goes down by one.
5. Reload the page. The tick and both todos are still there, so they reached Postgres and did not only live in the query cache.
6. Remove one todo with the bin icon. It disappears and stays gone after a reload.
7. When the change touches a contract, `packages/capability` or the RPC client, repeat 1 to 4 with `VITE_TODOS_TRANSPORT=rpc`. A change to the service or to `todos.capabilities.ts` runs the same code on both transports.

Each run adds todos to the demo user. Use a unique suffix in titles (a timestamp) so you match your own rows, and remove them at the end if the list grows past a screen.

## What usually lies

- **The counter after a toggle.** It comes from refetched data, not from local state. If it changes before the request finishes, someone added optimistic state; check that a failed request rolls it back.

The second add, the cache, owner isolation and the 401 that looks empty are in the skill's "When the app lies"; steps 2 and 5 exercise them here.
