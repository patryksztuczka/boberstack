# Send mail through a Mailer port: Mailpit locally, Cloudflare Email Service in production

**Status:** accepted, 2026-10-31.

Sign-up needs a verified email address and a forgotten password needs a reset link, so the api must send mail. Code that sends mail asks for the `Mailer` port in `apps/api/src/modules/mail/`; what a message says comes from a template in `modules/mail/templates/` (a pure function from data to subject, HTML and text). Which system delivers it is chosen once, in `apps/api/src/worker.ts`, by `MAIL_TRANSPORT`. Locally that is Mailpit (`platform/mail/mailpit.ts`), which `pnpm dev` starts in Docker: every mail lands in its inbox at the URL `pnpm dev` prints, nothing leaves the machine, and the integration tests run the same adapter against a Testcontainers Mailpit. A production transport is not written yet.

A mail provider's SDK called from the auth code would tie sign-up to one vendor and make tests send real mail or mock a library. Behind a port, the auth code, the templates and the tests stay the same whichever transport runs.

## Consequences

- `MAIL_TRANSPORT` has no default. A deploy without it fails while the Worker starts, so production never runs with verification required and no way to deliver the link.
- Adding the production transport: create `platform/mail/cloudflare-email.ts` exporting `{ layer, layerConfig }` for `Mailer`. Its `layerConfig` yields `Cloudflare.Email.Send(Email)` for a `Cloudflare.Email.SendEmail("Email")` binding and maps `send` failures to `MailDeliveryError`. In `apps/infra/alchemy.run.ts` add a `Cloudflare.Email.SendingSubdomain` for the sending domain and the binding to the api Worker, then add `cloudflare` to the `MAIL_TRANSPORT` literals in `worker.ts`. Under `alchemy dev` the binding writes `.eml` files instead of delivering, so keep Mailpit for local work.
- The sender address comes from `MAIL_FROM_EMAIL` and `MAIL_FROM_NAME`; templates load the wordmark and the beaver from the app's own origin (`apps/web/public/email/`).
- A new email is a new template with its unit test, sent from the code that needs it; it never calls an adapter directly.

## Considered options

- Resend (or Postmark) over HTTP for production: a fine alternative when the sending domain is not on Cloudflare; it would be one more adapter file and one more secret.
- SMTP: Workers can open TCP sockets, but an SMTP client is heavier than one HTTP call and Mailpit's HTTP send API covers local work.
- Alchemy's local email simulator alone: it saves `.eml` files on disk, with no inbox to click links in.
