import { tester } from "../../rule-tester.ts";
import { requireSafetyCommentForTypeAssertionRule } from "./require-safety-comment-for-type-assertion.ts";

tester.run("anti-slop/require-safety-comment-for-type-assertion", requireSafetyCommentForTypeAssertionRule, {
  valid: [
    "// SAFETY: the decoder checked the length above\nconst bytes = raw as Uint8Array;",
    "const tags = [\"a\", \"b\"] as const;",
  ],
  invalid: [
    {
      code: "const bytes = raw as Uint8Array;",
      errors: [{ messageId: "missingSafetyComment" }],
    },
  ],
});
