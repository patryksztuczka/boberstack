import { Context, Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { GenericContainer, Wait } from "testcontainers";

import { MailpitMailer } from "../platform/mail/index.ts";

export const MAILPIT_IMAGE = "axllent/mailpit:v1.32.0";

const MAILPIT_PORT = 8025;

const Address = Schema.Struct({ Name: Schema.String, Address: Schema.String });

export class DeliveredMail extends Schema.Class<DeliveredMail, { readonly brand: unique symbol }>(
  "DeliveredMail",
)({
  ID: Schema.String,
  From: Address,
  To: Schema.Array(Address),
  Subject: Schema.String,
  Text: Schema.String,
  HTML: Schema.String,
}) {}

const SearchResult = Schema.Struct({
  messages: Schema.Array(Schema.Struct({ ID: Schema.String })),
});

export interface MailpitInboxApi {
  readonly latestTo: (email: string) => Effect.Effect<DeliveredMail>;
}

export class MailpitInbox extends Context.Service<MailpitInbox, MailpitInboxApi>()(
  "boberstack/testing/MailpitInbox",
) {
  static readonly layer = (url: URL) =>
    Layer.effect(
      this,
      Effect.gen(function* () {
        const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);

        const get = <A, I>(path: string, schema: Schema.Codec<A, I>) =>
          client
            .get(new URL(path, url))
            .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)), Effect.orDie);

        return {
          latestTo: (email: string) =>
            get(`/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, SearchResult).pipe(
              Effect.flatMap((result) => Effect.fromNullishOr(result.messages[0])),
              Effect.orDie,
              Effect.flatMap((latest) => get(`/api/v1/message/${latest.ID}`, DeliveredMail)),
            ),
        };
      }),
    ).pipe(Layer.provide(FetchHttpClient.layer));
}

const startMailpit = Effect.acquireRelease(
  Effect.promise(() =>
    new GenericContainer(MAILPIT_IMAGE)
      .withExposedPorts(MAILPIT_PORT)
      .withWaitStrategy(Wait.forHttp("/readyz", MAILPIT_PORT))
      .start(),
  ),
  (container) => Effect.promise(() => container.stop()),
);

export const MailpitTestLayer = Layer.unwrap(
  Effect.map(startMailpit, (container) => {
    const url = new URL(
      `http://${container.getHost()}:${String(container.getMappedPort(MAILPIT_PORT))}`,
    );

    return Layer.merge(
      MailpitMailer.layer({ url, fromEmail: "noreply@boberstack.test", fromName: "boberstack" }),
      MailpitInbox.layer(url),
    );
  }),
);
