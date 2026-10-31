import { defineRule } from "vite-plus/lint/plugins";

import { enclosingFunction } from "../shared/ast.ts";
import { isEffectGenerator } from "../shared/effect-generators.ts";

export const noThrowInEffectRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow `throw` inside Effect generators." },
    messages: {
      throwInEffect:
        "Do not throw inside Effect code: it becomes an untyped defect callers cannot catchTag. Use `return yield* new SomethingError(…)` for failures, or `Effect.die` / `Effect.orDie` for broken invariants (see .agents/skills/effect-v4/references/02-typed-errors.md).",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        const fn = enclosingFunction(node);

        if (fn !== undefined && isEffectGenerator(context.sourceCode, fn)) {
          context.report({ node, messageId: "throwInEffect" });
        }
      },
    };
  },
});
