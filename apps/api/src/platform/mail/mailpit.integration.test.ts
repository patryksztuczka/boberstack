import { assert, describe, layer } from "@effect/vitest";
import { Effect } from "effect";

import { confirmEmail, Mailer } from "../../modules/mail/index.ts";
import { MailpitInbox, MailpitTestLayer } from "../../testing/mailpit-test.ts";

const link =
  "https://app.example.com/api/auth/verify-email?token=abc&callbackURL=%2Femail-verified";

describe("Mailer on Mailpit", () => {
  layer(MailpitTestLayer)((it) => {
    it.effect("delivers the confirmation mail with its link in both parts", () =>
      Effect.gen(function* () {
        const mailer = yield* Mailer;
        const inbox = yield* MailpitInbox;

        const mail = confirmEmail({
          name: "Ana",
          email: "ana@example.com",
          url: link,
          appUrl: "https://app.example.com",
        });

        yield* mailer.send({ to: { email: "ana@example.com", name: "Ana" }, ...mail });

        const delivered = yield* inbox.latestTo("ana@example.com");

        assert.strictEqual(delivered.Subject, "Confirm your email");
        assert.deepStrictEqual(delivered.To, [{ Name: "Ana", Address: "ana@example.com" }]);
        assert.strictEqual(delivered.From.Address, "noreply@boberstack.test");
        assert.include(delivered.Text, link);
        assert.include(delivered.HTML, link.replaceAll("&", "&amp;"));
      }),
    );

    it.effect("reports a typed error when Mailpit refuses the message", () =>
      Effect.gen(function* () {
        const mailer = yield* Mailer;

        const error = yield* mailer
          .send({ to: { email: "not an address", name: "" }, subject: "", html: "", text: "" })
          .pipe(Effect.flip);

        assert.strictEqual(error._tag, "MailDeliveryError");
        assert.strictEqual(error.recipient, "not an address");
      }),
    );
  });
});
