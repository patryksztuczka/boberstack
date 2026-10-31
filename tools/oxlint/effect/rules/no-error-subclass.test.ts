import { tester } from "../../rule-tester.ts";
import { noErrorSubclassRule } from "./no-error-subclass.ts";

const error = { messageId: "errorSubclass" };

tester.run("effect/no-error-subclass", noErrorSubclassRule, {
  valid: [
    'import { Schema } from "effect"; export class CertificateUnreadableError extends Schema.TaggedError<CertificateUnreadableError>()("CertificateUnreadableError", { reason: Schema.String }) {}',
    "class FrameReader extends Reader {}",
    "class Error {} class LocalError extends Error {}",
  ],
  invalid: [
    {
      code: "class InvalidCursor extends TypeError {}",
      errors: [{ ...error, data: { base: "TypeError" } }],
    },
    { code: "const Refusal = class extends Error {};", errors: [error] },
    { code: "class Refusal extends RangeError { constructor() { super(); } }", errors: [error] },
  ],
});
