import { defineRule } from "vite-plus/lint/plugins";

import { staticString } from "../shared/ast.ts";
import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

const plainStringConfigs = new Set([
  "String",
  "NonEmptyString",
  "URL",
  "string",
  "nonEmptyString",
  "url",
]);

const defaultPattern = "SECRET|TOKEN|PASSWORD|DSN|API_KEY|PRIVATE_KEY|DATABASE_URL";

export const redactedSecretsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require Config.Redacted for secret-looking configuration keys." },
    messages: {
      secret:
        "`{{key}}` looks like a secret: read it with `Config.Redacted` so it shows as <redacted> in logs, spans and error reports (see .agents/skills/effect-best-practices/references/07-configuration.md).",
    },
    schema: [
      {
        type: "object",
        properties: { secretPattern: { type: "string" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ secretPattern: defaultPattern }],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const member = effectMember(context.sourceCode, node.callee);

        if (member?.module !== "Config" || !plainStringConfigs.has(member.member)) return;
        const key = staticString(node.arguments[0]);

        if (key === undefined) return;
        const { secretPattern } = ruleOptions(context, { secretPattern: defaultPattern });

        if (new RegExp(secretPattern, "i").test(key)) {
          context.report({ node, messageId: "secret", data: { key } });
        }
      },
    };
  },
});
