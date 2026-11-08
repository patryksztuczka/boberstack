import { Context } from "effect";
import type { Effect } from "effect";

import type { MailDeliveryError } from "./mail.errors.ts";

export interface MailRecipient {
  readonly email: string;
  readonly name: string;
}

export interface MailMessage {
  readonly to: MailRecipient;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface MailerApi {
  readonly send: (message: MailMessage) => Effect.Effect<void, MailDeliveryError>;
}

export class Mailer extends Context.Service<Mailer, MailerApi>()("boberstack/mail/Mailer") {}
