import { fileURLToPath } from "node:url";

import { tester } from "../../../rule-tester.ts";
import { configInEnvSchemaRule } from "./config-in-env-schema.ts";

const options = [
  { schema: fileURLToPath(new URL("fixtures/config-in-env-schema.env", import.meta.url)) },
];

tester.run("@boberstack/effect/config-in-env-schema", configInEnvSchemaRule, {
  valid: [
    { code: 'import { Config } from "effect"; Config.URL("PUBLIC_URL");', options },
    { code: 'import { Config } from "effect"; Config.Redacted("API_TOKEN");', options },
    {
      code: 'import { Config } from "effect"; Config.Literals(["mailpit"], "MAIL_TRANSPORT");',
      options,
    },
    {
      code: 'import { Config } from "effect"; Config.String("PUBLIC_URL").pipe(Config.withDefault("x"));',
      options,
    },
    { code: 'const Config = { String: (k) => k }; Config.String("UNKNOWN");', options },
  ],
  invalid: [
    {
      code: 'import { Config } from "effect"; Config.String("UNDECLARED");',
      options,
      errors: [{ messageId: "missing" }],
    },
    {
      code: 'import { Config } from "effect"; Config.String("API_TOKEN");',
      options,
      errors: [{ messageId: "readPlain" }],
    },
    {
      code: 'import { Config } from "effect"; Config.Redacted("PLAIN_FLAG");',
      options,
      errors: [{ messageId: "notSensitive" }],
    },
    {
      code: 'import { Config } from "effect"; const prefix = "GITHUB"; Config.String(`${prefix}_CLIENT_ID`);',
      options,
      errors: [{ messageId: "dynamicName" }],
    },
    {
      code: 'import { Config } from "effect"; Config.Literals(["mailpit"], "MAIL_TRANSPOR");',
      options,
      errors: [{ messageId: "missing" }],
    },
  ],
});
