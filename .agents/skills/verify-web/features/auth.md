# Auth

## What exists

Email and password through better-auth, mounted at `/api/auth` in the api Worker, with verified email required: sign-up sends a Verification link, and sign-in refuses an unverified User and sends a new one. Password reset by mail. GitHub and Google sign-in when their client id and secret are set; `GET /api/sign-in-methods` tells the web which buttons to show. Pages `/sign-up`, `/sign-in`, `/check-email`, `/email-verified`, `/forgot-password`, `/reset-password`, and a "Sign out" button in the header. The api reads the session in its HttpApi and RPC middleware and answers `401` without one.

Mail goes through the `Mailer` port; locally it lands in Mailpit, at `urls.mailpit` in `.dev/state.json` (root ADR 0008).

Code: `apps/web/src/features/auth/`, `apps/api/src/platform/authentication/`, `apps/api/src/modules/mail/` (templates), `apps/api/src/platform/mail/`, tables in `apps/api/migrations/0001_auth.sql`.

## How to reach it

`/sign-in` and `/sign-up` while signed out. The demo user is `demo@example.com` / `demo12345`; `pnpm dev:doctor` creates and verifies it. For a new user, use a unique email such as `verify+<timestamp>@example.com`. Read mail in the Mailpit UI, or through its API: `GET <mailpit>/api/v1/search?query=to:<email>` for the newest message id, then `GET <mailpit>/api/v1/message/<id>` for its `Text` and `HTML`.

## Drive

1. On `/sign-up`, submit the empty form. Three field errors appear: name, email, password.
2. Sign up a new user. You land on `/check-email`, and Mailpit holds "Confirm your email" for that address within a second.
3. Before confirming, sign in with that user on `/sign-in`. The page says the email is not verified and that a new link was sent; Mailpit holds a second mail.
4. Open the link from the newest mail. After sign-up it lands on `/email-verified`; after a refused sign-in it returns to the requested page, signed in.
5. Sign out, then on `/forgot-password` ask for a reset. Mailpit holds "Reset your password"; its link opens `/reset-password`. Set a new password and sign in with it.
6. Sign in as the demo user. You see the demo user's todos, not the new user's.

## What usually lies

- **"Invalid origin" or a rejected callback URL in dev.** `pnpm dev` sets `AUTH_BASE_URL` to the web URL, so links in mail and redirects stay on the web origin, and `AUTH_TRUSTED_ORIGINS` to the api URL, because the Vite proxy rewrites `Origin` to it. If sign-in fails only in dev with `403`, or a mail link answers with an invalid-callback error, one of the two drifted. Check `.dev/logs/api.log`.
- **A link from an old mail.** Verification links last 24 hours, reset links one hour and once. Always open the newest message for the address.
- **The mail renders, the images do not.** The wordmark and the beaver load from `<app>/email/*.png`. In Mailpit they come from the web dev server; a 404 there means `apps/web/public/email/` is missing a file.
- **Stale data after sign-out.** Sign-out clears the TanStack Query cache. Without that, the next user briefly sees the previous user's todos. Step 6 after step 4 catches it.
- **A session cookie from an earlier run.** A reused browser profile is already signed in, so `/sign-in` jumps straight to `/todos`. Start from a fresh profile or sign out first.
- **Unit tests of the forms.** They never talk to better-auth or Mailpit, so a broken `/api/auth` route or a broken mail adapter passes them.

- **Verification mail after a refused sign-in goes to the home page.** `signIn.email` must receive a same-origin `callbackURL` for the requested page too. better-auth reuses it in the automatically sent verification mail. Checking only the sign-up mail misses this.
