import { defineRule } from "vite-plus/lint/plugins";

import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const throwingCodecs = new Set([
  "decodeUnknownSync",
  "decodeSync",
  "decodeUnknownPromise",
  "decodePromise",
  "encodeSync",
  "encodeUnknownSync",
  "encodePromise",
  "encodeUnknownPromise",
  "validateSync",
]);

const defaultAllow = ["scripts/**", "**/*.test.ts"];

export const noDecodeSyncRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow throwing Schema decoders and encoders outside scripts and tests.",
    },
    messages: {
      throwing:
        "`Schema.{{method}}` throws, turning bad input into a defect. Use `Schema.decodeUnknownEffect` / `encodeEffect` so the failure stays typed (see .agents/skills/effect-best-practices/references/06-schema.md).",
    },
    schema: [
      {
        type: "object",
        properties: { allow: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allow: defaultAllow }],
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const member = effectMember(context.sourceCode, node);

        if (member?.module !== "Schema" || !throwingCodecs.has(member.member)) return;
        const { allow } = ruleOptions(context, { allow: defaultAllow });

        if (matchesAny(relativeFilename(context), allow)) return;
        context.report({ node, messageId: "throwing", data: { method: member.member } });
      },
    };
  },
});
