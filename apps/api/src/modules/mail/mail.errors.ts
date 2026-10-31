import { Schema } from "effect";

export class MailDeliveryError extends Schema.TaggedError<
  MailDeliveryError,
  { readonly brand: unique symbol }
>()("MailDeliveryError", { recipient: Schema.String, reason: Schema.String }) {}
