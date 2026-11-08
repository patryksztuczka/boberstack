# The desktop app is a thin Electron client of the deployed app

**Status:** accepted, 2026-11-08.

We wanted a desktop app without a second front end or a second api. The web app already talks to one origin: `HttpApi`, RPC and better-auth all use `location.origin` plus `/api`, and the session lives in a same-origin cookie. better-auth's client refuses any origin that is not `http:` or `https:`, and it sends absolute callback URLs built from `location.origin` that end up in emails. A custom scheme such as `app://` breaks both.

`apps/desktop` is an Electron shell around the same SPA, and the window takes the place of the deployed app's own origin. In development the window opens this checkout's Vite server, so it behaves like a browser tab. In bundle mode it opens `DESKTOP_APP_URL`, and `protocol.handle` for that origin's scheme serves `apps/web/dist` from disk. `/api` requests and every other host go to the network unchanged, with the session cookies Chromium keeps for that origin. The api, CORS, cookie scope and trusted origins do not change. The main process is an Effect program (root ADR 0002). It runs no local backend: the services stay in the api Worker.

## Consequences

- Electron APIs are called in `apps/desktop/src/main.ts` only. The decisions it makes (which file serves a request, where a navigation may go) are plain functions with unit tests, and the wiring is checked by running the app.
- A request the window makes to its own `/api` arrives in `protocol.handle` without an `Origin` header, and better-auth refuses a POST that carries cookies without one. The handler adds the app's origin to those requests only.
- Every navigation away from the app's origin, OAuth included, opens in the system browser. Social sign-in in the desktop app needs its own flow (a deep link back and a one-time token), which is not built yet.
- The renderer has no preload and no bridge. The first feature that needs one adds a contract in `packages/domain` (root ADR 0007).
- A local backend, offline data or desktop-only rules would change this decision. They would compose `packages/core` in the main process (root ADR 0009), and need their own store adapter and identity source.

## Considered options

- A custom `boberstack://app` scheme with `/api` forwarded by the main process: the better-auth client refuses the origin, and email links would point at it.
- A made-up `https://app.boberstack.invalid` origin: callback URLs fail better-auth's trusted-origin check and the links in emails lead nowhere.
- Loading the deployed URL straight from the network: no window without a connection, and every release of the web app changes the desktop app under the user.
