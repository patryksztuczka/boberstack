import { tester } from "../../../rule-tester.ts";
import { noDecodeSyncRule } from "./no-decode-sync.ts";

const error = { messageId: "throwing" };

const app = "apps/api/src/ingest/MinutePackageReader.ts";

tester.run("@boberstack/effect/no-decode-sync", noDecodeSyncRule, {
  valid: [
    {
      code: 'import { Schema } from "effect"; const pkg = Schema.decodeUnknownEffect(MinutePackage)(body);',
      filename: app,
    },
    {
      code: 'import { Schema } from "effect"; const pkg = Schema.decodeUnknownSync(MinutePackage)(body);',
      filename: "scripts/seed.ts",
    },
    {
      code: 'import { Schema } from "effect"; const pkg = Schema.decodeUnknownSync(MinutePackage)(body);',
      filename: "apps/api/src/ingest/x.test.ts",
    },
    {
      code: "const Schema = { decodeUnknownSync: () => 1 }; Schema.decodeUnknownSync(x);",
      filename: app,
    },
  ],
  invalid: [
    {
      code: 'import { Schema } from "effect"; const pkg = Schema.decodeUnknownSync(MinutePackage)(body);',
      filename: app,
      errors: [error],
    },
    {
      code: 'import { Schema as S } from "effect"; const wire = S.encodeSync(MinutePackage)(pkg);',
      filename: app,
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const p = await Schema.decodeUnknownPromise(MinutePackage)(body);',
      filename: app,
      errors: [error],
    },
  ],
});
