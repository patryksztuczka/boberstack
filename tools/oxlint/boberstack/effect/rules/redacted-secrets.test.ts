import { tester } from "../../../rule-tester.ts";
import { redactedSecretsRule } from "./redacted-secrets.ts";

const error = { messageId: "secret" };

tester.run("@boberstack/effect/redacted-secrets", redactedSecretsRule, {
  valid: [
    'import { Config } from "effect"; const dsn = Config.Redacted("SENTRY_DSN");',
    'import { Config } from "effect"; const host = Config.String("HTTP_HOST");',
    'const Config = { String: (k) => k }; Config.String("API_TOKEN");',
  ],
  invalid: [
    {
      code: 'import { Config } from "effect"; const dsn = Config.String("SENTRY_DSN");',
      errors: [error],
    },
    {
      code: 'import { Config } from "effect"; const url = Config.URL("DATABASE_URL");',
      errors: [error],
    },
    {
      code: 'import { Config } from "effect"; const t = Config.string("provider_api_token");',
      errors: [error],
    },
    {
      code: 'import { Config } from "effect"; const k = Config.String("SIGNING_SEED");',
      options: [{ secretPattern: "SEED" }],
      errors: [error],
    },
  ],
});
