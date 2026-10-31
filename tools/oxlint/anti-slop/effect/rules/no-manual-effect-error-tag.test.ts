import { tester } from "../../../rule-tester.ts";
import { noManualEffectErrorTagRule } from "./no-manual-effect-error-tag.ts";

tester.run("anti-slop-effect/no-manual-effect-error-tag", noManualEffectErrorTagRule, {
  valid: [
    "import { Effect } from \"effect\";\nprogram.pipe(Effect.catchTag(\"NotFound\", () => onMissing));",
  ],
  invalid: [
    {
      code: "import { Effect } from \"effect\";\nprogram.pipe(Effect.catch((e) => (e._tag === \"NotFound\" ? onMissing : Effect.fail(e))));",
      errors: [{ messageId: "tag" }],
    },
  ],
});
