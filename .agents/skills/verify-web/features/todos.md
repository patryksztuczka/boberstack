# Todos

## What exists

A signed-in user's own list at `/todos`: add, mark done, remove, and a "N todos left" counter. The page talks to the api over HttpApi by default and over RPC when the web app runs with `VITE_TODOS_TRANSPORT=rpc`. The card's subtitle says which one ("Talking to the API over HttpApi.").

Code: `apps/web/src/features/todos/`, contract in `packages/domain/src/todos/`, handlers in `apps/api/src/http/todos.http.ts` and `apps/api/src/rpc/todos.rpc.ts`, SQL in `apps/api/src/platform/database/todo.repository.ts`.

## How to reach it

Sign in as `demo@example.com` / `demo12345` (the doctor creates the user). `/` and a successful sign-in both land on `/todos`. Signed out, `/todos` redirects to `/sign-in`.

For the RPC transport, stop dev and start it again with `VITE_TODOS_TRANSPORT=rpc pnpm dev`. The subtitle must then say RPC.

## Drive

1. Note the counter. Add a todo with spaces around the title, for example `  First run  `. It appears trimmed as `First run`, the input is empty again, the counter goes up by one.
2. Add a second todo right away, without reloading. It must appear too. This is the step that broke once.
3. Submit an empty or whitespace-only title. Nothing is added and the field shows the "1 to 200 characters" error.
4. Tick the first todo. The title gets struck through and the counter goes down by one.
5. Reload the page. The tick and both todos are still there, so they reached Postgres and did not only live in the query cache.
6. Remove one todo with the bin icon. It disappears and stays gone after a reload.
7. When the change touches the api or the contract, repeat 1 to 4 with `VITE_TODOS_TRANSPORT=rpc`.

Each run adds todos to the demo user. Use a unique suffix in titles (a timestamp) so you match your own rows, and remove them at the end if the list grows past a screen.

## What usually lies

- **The second add.** Under the React Compiler, `form.reset()` plus reading `form.formState` made the first submit work and every later one do nothing. Tests that render the form once never see it. Always add two in a row. The form uses `useFormState` and `resetField` for this reason.
- **The counter after a toggle.** It comes from refetched data, not from local state. If it changes before the request finishes, someone added optimistic state; check that a failed request rolls it back.
- **A list that only lives in the cache.** A mutation that forgets to invalidate `todos` still looks right until you reload. Step 5 catches it.
- **Owner isolation.** Another user must not see the demo user's todos. Sign up a second user in a fresh browser profile when you touch the repository or the auth middleware.
- **A 401 that looks like an empty list.** If the list is empty after sign-in, check `.dev/logs/api.log` and the network for `401` before you believe it.
