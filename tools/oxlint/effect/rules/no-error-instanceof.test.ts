import { tester } from "../../rule-tester.ts";
import { noErrorInstanceofRule } from "./no-error-instanceof.ts";

const error = { messageId: "errorInstanceof" };

tester.run("effect/no-error-instanceof", noErrorInstanceofRule, {
  valid: ["const isDay = (value) => value instanceof Date;"],
  invalid: [
    {
      code: "const recovered = cause instanceof UserNotFoundError ? cause : new MalformedRequestError({});",
      errors: [{ ...error, data: { name: "UserNotFoundError" } }],
    },
    {
      code: "const lost = cause instanceof errors.JobRunClaimLostError;",
      errors: [{ ...error, data: { name: "errors.JobRunClaimLostError" } }],
    },
  ],
});
