# Local development

You need Node 26.13.0 (`.node-version`), pnpm 11.28.9 and Docker.

## Start the stack

```sh
pnpm install     # also installs the Git hooks
pnpm dev         # Postgres and Mailpit in Docker, migrations, the api via node --watch, the web app via vp dev
pnpm dev:doctor  # in a second terminal: checks the stack and creates and verifies demo@example.com / demo12345
```

`pnpm dev` prints the URLs. Open the web URL, sign in as the demo user and add a todo. The CLI's `db migrate` command applies `packages/database/migrations/` to the local database on every start.

Ports come from a hash of the checkout path, so two worktrees can run `pnpm dev` at once. Each checkout gets its own Compose project, database and Mailpit inbox. [AGENTS.md](../../AGENTS.md#commands) lists where the state and logs live and the variables that override the ports.

`pnpm dev:status` shows what is running, `pnpm dev:stop` stops it, and `pnpm db:down` also stops this checkout's Postgres.

## Mail

Every mail the app sends locally, such as the account confirmation and the password reset, lands in Mailpit at the `mail` URL `pnpm dev` prints. Nothing leaves your machine (root ADR 0006).

## Environment

[`.env.schema`](../../.env.schema) declares every variable. Put local values in `.env.local`, which Git ignores, and run `pnpm env:check` to validate them.

To try GitHub or Google sign-in, create an OAuth app with the provider and set its callback URL to `<web URL>/api/auth/callback/github` (or `/google`). Put `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, or the `GOOGLE_` pair, in `.env.local`. Without them the buttons do not appear.

## Desktop app

`apps/desktop` is an Electron window around the same web app (root ADR 0008). With `pnpm dev` running, start it in a second terminal:

```sh
pnpm dev:desktop                                      # builds the main process and opens the window on this checkout's Vite server
pnpm dev:desktop -- --remote-debugging-port=9333      # the same, with DevTools on port 9333 for agent-browser --cdp 9333
```

The window opens the web URL `pnpm dev` printed, so Vite's hot reload works as in a browser. A change to `apps/desktop/src` needs a restart: quit the window and run the command again. Each checkout keeps its cookies, cache and single-instance lock in `.dev/desktop`, so a second worktree opens its own window and its own session.

Bundle mode is what a packaged app will do. It serves `apps/web/dist` from disk and sends `/api` to the app named by `DESKTOP_APP_URL`. To try it against the local api:

```sh
pnpm --filter @boberstack/web build
pnpm --filter @boberstack/desktop run build
DESKTOP_APP_URL=<api URL from pnpm dev> DESKTOP_USER_DATA_DIR=$PWD/.dev/desktop-bundle pnpm --filter @boberstack/desktop start
```

Social sign-in opens the provider in the system browser and does not come back to the window yet; sign in with email in the desktop app. Electron downloads its binary the first time it starts, not at install. Run it from a terminal that does not set `ELECTRON_RUN_AS_NODE`: an Electron-based editor can set it, and then the window starts as plain Node. `pnpm dev:desktop` removes it for you.

The window and the Dock show `apps/desktop/resources/icon.png`. Packaging comes later: electron-builder will turn that file into the macOS `.icns` and the Windows `.ico`, and sign the app.

## Mobile app

`apps/mobile` is a native Expo app on the same api (root ADR 0009). With `pnpm dev` running, `pnpm dev:mobile` builds it and opens it in the iOS simulator. [Mobile app](mobile.md) has the setup, the variants and the release steps.

## Before you push

`pnpm check:changed` checks the files you touched. `pnpm verify` runs what CI runs, and the pre-push hook runs it too. Add `pnpm test:integration` when you touched SQL, migrations, auth or an endpoint.
