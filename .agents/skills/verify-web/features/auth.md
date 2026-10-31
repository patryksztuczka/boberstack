# Auth

## What exists

Email and password sign-up and sign-in through better-auth, mounted at `/api/auth` in the api Worker. Pages `/sign-up` and `/sign-in`, a "Sign out" button in the header. The api reads the session in its HttpApi and RPC middleware and answers `401` without one.

Code: `apps/web/src/features/auth/`, `apps/api/src/platform/authentication/`, tables in `apps/api/migrations/0001_auth.sql`.

## How to reach it

`/sign-in` and `/sign-up` while signed out. Signed in, both redirect to `/todos`. The demo user is `demo@example.com` / `demo12345`. For a new user, use a unique email such as `verify+<timestamp>@example.com`.

## Drive

1. On `/sign-up`, submit the empty form. Three field errors appear: name, email, password.
2. Sign up a new user with an 8-character password. You land on `/todos` with an empty list.
3. Sign out. You land on `/sign-in`, and opening `/todos` sends you to `/sign-in`.
4. Sign in as the demo user. You land on `/todos` and see the demo user's todos, not the new user's.
5. Sign in with a wrong password. The form shows "That did not work: ..." and you stay on `/sign-in`.

## What usually lies

- **"Invalid origin" through the dev proxy.** The browser's `Origin` is the web port; better-auth compares it with its own base URL. The Vite proxy rewrites `Origin` to the api URL and `pnpm dev` sets `AUTH_BASE_URL` to the same URL. If sign-in fails only in dev with `403`, one of the two drifted. Check `.dev/logs/api.log`.
- **Stale data after sign-out.** Sign-out clears the TanStack Query cache. Without that, the next user briefly sees the previous user's todos. Step 4 after step 2 catches it.
- **A session cookie from an earlier run.** A reused browser profile is already signed in, so `/sign-in` jumps straight to `/todos` and the sign-in form never renders. Start from a fresh profile or sign out first.
- **Unit tests of the forms.** They check validation only. They never talk to better-auth, so a broken `/api/auth` route passes them.
