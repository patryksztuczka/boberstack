import { defineRule } from "vite-plus/lint/plugins";
import type { Comment } from "vite-plus/lint/plugins";

const disablePattern = /^(?:es|ox)lint-disable(?:-next-line|-line)?(?=\s|$)(?<rest>.*)$/su;

const expectErrorPattern = /^@ts-expect-error(?=\s|$)(?<rest>.*)$/su;

const ignorePattern = /^@ts-(?:ignore|nocheck)\b/u;

const textOf = (comment: Comment): string =>
  comment.value
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/u, "").trim())
    .join(" ")
    .trim();

const disableProblem = (rest: string): "noRule" | "noReason" | undefined => {
  const [rules = "", ...reason] = rest.split(/\s--\s|\s--$/u);

  if (rules.trim() === "") return "noRule";

  return reason.join(" ").trim() === "" ? "noReason" : undefined;
};

export const requireSuppressionReasonRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every lint or type-check suppression to name what it turns off and say why.",
    },
    messages: {
      noRule:
        "Name the rule you turn off: `// oxlint-disable-next-line <plugin/rule> -- <why it does not apply here>`. A bare disable turns off every rule, including the ones you did not mean to (see tools/oxlint/suppressions/README.md).",
      noReason:
        "Say why the rule does not apply here, after ` -- `: `// oxlint-disable-next-line <plugin/rule> -- <why>`. If you cannot say why, fix the code instead; `pnpm check:suppressions` counts every disable (see tools/oxlint/suppressions/README.md).",
      expectErrorReason:
        "Say which error you expect and why it is fine: `// @ts-expect-error <why>`. If you cannot, fix the type instead (see tools/oxlint/suppressions/README.md).",
      ignore:
        "`@ts-ignore` and `@ts-nocheck` hide every error, including future ones. Fix the type, or use `// @ts-expect-error <why>` so the line fails once the error is gone (see tools/oxlint/suppressions/README.md).",
    },
    schema: [],
  },
  create(context) {
    const check = (comment: Comment): void => {
      const text = textOf(comment);

      if (ignorePattern.test(text)) {
        context.report({ loc: comment.loc, messageId: "ignore" });

        return;
      }

      const expectError = expectErrorPattern.exec(text);

      if (expectError !== null) {
        if ((expectError.groups?.["rest"] ?? "").replace(/^\s*--/u, "").trim() === "") {
          context.report({ loc: comment.loc, messageId: "expectErrorReason" });
        }

        return;
      }

      const disable = disablePattern.exec(text);

      if (disable === null) return;
      const problem = disableProblem(disable.groups?.["rest"] ?? "");

      if (problem !== undefined) context.report({ loc: comment.loc, messageId: problem });
    };

    return {
      "Program:exit"() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type !== "Shebang") check(comment);
        }
      },
    };
  },
});
