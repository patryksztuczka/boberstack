import { Config, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

import { MailDeliveryError, Mailer } from "../../modules/mail/index.ts";
import type { MailMessage } from "../../modules/mail/index.ts";

export interface MailpitOptions {
  readonly url: URL;
  readonly fromEmail: string;
  readonly fromName: string;
}

const payload = (options: MailpitOptions, message: MailMessage) => ({
  From: { Email: options.fromEmail, Name: options.fromName },
  To: [{ Email: message.to.email, Name: message.to.name }],
  Subject: message.subject,
  HTML: message.html,
  Text: message.text,
});

const layer = (options: MailpitOptions) =>
  Layer.effect(
    Mailer,
    Effect.gen(function* () {
      const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);
      const endpoint = new URL("/api/v1/send", options.url);

      return {
        send: Effect.fn("Mailpit.send")(
          function* (message: MailMessage) {
            const request = yield* HttpClientRequest.post(endpoint).pipe(
              HttpClientRequest.bodyJson(payload(options, message)),
            );

            yield* client.execute(request);
          },
          (effect, message) =>
            effect.pipe(
              Effect.mapError(
                (error) =>
                  new MailDeliveryError({ recipient: message.to.email, reason: error.message }),
              ),
            ),
        ),
      };
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));

const layerConfig = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* Config.URL("MAILPIT_URL");

    const fromEmail = yield* Config.String("MAIL_FROM_EMAIL").pipe(
      Config.withDefault("noreply@boberstack.dev"),
    );

    const fromName = yield* Config.String("MAIL_FROM_NAME").pipe(Config.withDefault("boberstack"));

    return layer({ url, fromEmail, fromName });
  }),
);

export const MailpitMailer = { layer, layerConfig };
