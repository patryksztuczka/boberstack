# Todos

## What exists

Signed out, the app shows the welcome screen, then the sign-in screen. Signed in, it shows the user's own todos: add, mark done, remove, pull to refresh, a "Left to do: N" footer and Sign out in the header. The screens read the shared atoms in `packages/client-runtime` over HttpApi.

Code: `apps/mobile/src/features/welcome/`, `apps/mobile/src/features/auth/`, `apps/mobile/src/features/todos/`, `apps/mobile/src/app/`; the atoms in `packages/client-runtime/src/todos/`.

## How to reach it

Open `com.boberstack.app.dev` with `--metro-port`, `--launch-url` and `--relaunch` (SKILL.md, step 3). On the welcome screen press `id="welcome-sign-in"`, then fill `id="sign-in-email"` and `id="sign-in-password"` with `demo@example.com` / `demo12345` and press `id="sign-in-submit"`. Dismiss "Save Password?" if iOS asks. The todos screen is up when `id="new-todo-title"` is.

## Drive

Use a unique suffix in titles (a timestamp) so you match your own rows.

1. Fill `id="new-todo-title"` with `  First run <suffix>  ` and press `id="new-todo-add"`. The row appears trimmed, the field is empty again and the footer count goes up by one.
2. Add a second todo right away. It must appear too.
3. Press `id="new-todo-add"` with an empty field. Nothing is added and the "1 to 200 characters" error shows.
4. Press `id="todo-toggle-First run <suffix>"`. The row's state in the settled diff turns from `[unchecked]` to `[checked]` and the footer count goes down by one.
5. Relaunch with the same `open` command. Both todos and the tick are still there, so they reached Postgres.
6. Press `id="todo-remove-First run <suffix>"`. The row disappears; remove the second one too and the empty-list text shows. Relaunch: they stay gone.
7. Press `id="sign-out"`. The app returns to the welcome screen (`id="welcome-sign-in"`); a relaunch keeps it there.

Remove your todos at the end if the list grows past a screen.

## What usually lies

The 401 that looks empty, data that only lives in the atom and the keychain are in the skill's "When the app lies"; step 5 exercises them here.
