# Send mail through a Mailer port, with Mailpit locally and the project's own production transport

**Status:** accepted, 2026-10-31.

Sign-up needs a verified email address and a forgotten password needs a reset link, so the api must send mail. Which provider delivers it in production depends on the project: where it is hosted, which domain it sends from, what the team already pays for. The template does not choose one.

Code that sends mail asks for the `Mailer` port in `packages/core/src/mail/`; what a message says comes from a template in `packages/core/src/mail/templates/` (a pure function from data to subject, HTML and text). Which system delivers it is chosen once, in `apps/api/src/app.layer.ts`, by `MAIL_TRANSPORT`. The template ships one adapter, Mailpit (`packages/mail/src/mailpit.ts`), which `pnpm dev` starts in Docker: every mail lands in its inbox at the URL `pnpm dev` prints, nothing leaves the machine, and the integration tests run the same adapter against a Testcontainers Mailpit.

A provider's SDK called from the auth code would tie sign-up to one vendor and make tests send real mail or mock a library. Behind a port, the auth code, the templates and the tests stay the same whichever transport runs.

## Consequences

- `MAIL_TRANSPORT` has no default. A deploy without it fails while the api starts, so production never runs with verification required and no way to deliver the link.
- Before the first deploy, the project adds its production transport: `packages/mail/src/<transport>.ts` exporting `{ layer, layerConfig }` for `Mailer`, which maps delivery failures to `MailDeliveryError`. Export it from `packages/mail/src/index.ts`, add its name to the `MAIL_TRANSPORT` literals in `apps/api/src/app.layer.ts` and the enum in `.env.schema`, and declare its secrets in `.env.schema`. An HTTP API (Resend, Postmark, Amazon SES, Mailgun) works on every host; SMTP works on the Node host; on the Cloudflare host, Cloudflare Email Service is a binding on the Worker.
- The sender address comes from `MAIL_FROM_EMAIL` and `MAIL_FROM_NAME`; templates load the wordmark and the beaver from the app's own origin (`apps/web/public/email/`).
- A new email is a new template with its unit test, sent from the code that needs it; it never calls an adapter directly.

## Considered options

- A production adapter in the template: every project that uses another provider would delete it first.
- Alchemy's local email simulator instead of Mailpit: it saves `.eml` files on disk, with no inbox to click links in.
