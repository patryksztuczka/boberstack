import { tester } from "../../../rule-tester.ts";
import { moduleBoundariesRule } from "./module-boundaries.ts";

const matcher = "packages/core/src/todos/tagging/tag-index.ts";

const adapter = "packages/mail/src/smtp-mailer.ts";

const platformOptions = [{ indexOnly: ["packages/*/src/**"] }];

const reference = "packages/core/src/todos/sharing/share-link.constants.ts";

const rootOptions = [{ rootFiles: ["apps/*/src/*"] }];

tester.run("@boberstack/effect/module-boundaries", moduleBoundariesRule, {
  valid: [
    { code: 'import { bestCandidate } from "./scoring";', filename: matcher },
    { code: 'import { ShareLinks } from "../sharing";', filename: matcher },
    { code: 'import { ShareLinks } from "../sharing/index";', filename: matcher },
    { code: 'import { Accounts } from "@/accounts";', filename: matcher },
    { code: 'import { Accounts } from "../../accounts";', filename: matcher },
    { code: 'import { Effect } from "effect";', filename: matcher },
    {
      code: 'import { TagIndex } from "./tagging";',
      filename: "packages/core/src/todos/todos.layer.ts",
    },
    { code: 'import { x } from "../other/deep/file";', filename: "scripts/tool.ts" },
    {
      code: 'import { ShareLinkStub } from "../sharing/testing";',
      filename: "packages/core/src/todos/tagging/tag-index.test.ts",
    },
    {
      code: 'import { ShareLinkStub } from "../sharing/testing/index.ts";',
      filename: "packages/core/src/todos/tagging/tag-index.test.ts",
    },
    {
      code: 'import { ShareLinkStub } from "../../sharing/testing/index.ts";',
      filename: "packages/core/src/todos/tagging/testing/tag-index-suite.ts",
    },
    {
      code: 'import { ShareLinkStub } from "../../sharing/testing/index.ts";',
      filename: "packages/core/src/todos/tagging/tests/tag-world.ts",
    },
    {
      code: 'import { TodoStore } from "../../core/src/todos/lists/index.ts";',
      filename: adapter,
      options: platformOptions,
    },
    {
      code: 'import { runConformance } from "../../core/src/todos/lists/testing/index.ts";',
      filename: "packages/mail/src/smtp-mailer.integration.test.ts",
      options: platformOptions,
    },
    {
      code: 'import { DatabaseConnection } from "../../database/src/database-connection.ts";',
      filename: adapter,
      options: platformOptions,
    },
    {
      code: 'import { ReminderClock } from "../../../packages/core/src/todos/reminders/reminder-clock.ts";',
      filename: "apps/api/src/app.layer.ts",
      options: platformOptions,
    },
    {
      code: 'import { parseQuery } from "../../../../../apps/api/src/http/query.ts";',
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'import { runEffect } from "./runtime.ts";',
      filename: "apps/api/src/api-server.ts",
      options: rootOptions,
    },
    {
      code: 'import { NodeEnvironment } from "../../../../../apps/api/src/node-environment.ts";',
      filename: reference,
      options: [{ rootFiles: [] }],
    },
    {
      code: "const loaded = await import(name);",
      filename: reference,
      options: [{ rootFiles: [] }],
    },
    {
      code: 'const query = await import("../../../../../apps/api/src/http/" + name);',
      filename: reference,
      options: rootOptions,
    },
    {
      code: "const query = await import(`../../../../../apps/api/src/http/${name}`);",
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'import { answers } from "../../../../../apps/api/src/http/";',
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'import { answers } from "../../../../../apps/api/src/http/index.ts";',
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'const { layerTestConfig } = require("../../../../../apps/api/src/testing/test-config.ts");',
      filename: "packages/core/src/todos/sharing/share-link.test.ts",
      options: rootOptions,
    },
    {
      code: 'type Env = typeof import("../../../../../apps/api/src/http/http.layer.ts");',
      filename: "packages/core/src/todos/sharing/share-link.test.ts",
      options: rootOptions,
    },
    {
      code: 'import config = require("../../../../../apps/api/src/testing/test-config.ts");',
      filename: "packages/core/src/todos/sharing/share-link.test.ts",
      options: rootOptions,
    },
  ],
  invalid: [
    {
      code: 'import { NodeEnvironment } from "../../../../../apps/api/src/node-environment.ts";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'export { CorsPolicy } from "../../../../apps/api/src/origin-policy.ts";',
      filename: "packages/core/src/accounts/index.ts",
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const tracing = await import("../../../../../apps/api/src/tracing.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { AppLayer } from "../../../../../../apps/api/src/app.layer.ts";',
      filename: "packages/core/src/todos/sharing/tests/share-link.test.ts",
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const root = await import("../../../../../apps/api/src/" + "app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const root = await import("../../../../../" + "apps/api/src/" + "runtime.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const root = await import("../../../../../apps/api/src/" + name);',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFileDynamic" }],
    },
    {
      code: "const root = await import(`../../../../../apps/api/src/${name}.ts`);",
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFileDynamic" }],
    },
    {
      code: 'const root = require("../../../../../apps/api/src/app" + suffix);',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFileDynamic" }],
    },
    {
      code: "const root = await import(name);",
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFileDynamic" }],
    },
    {
      code: 'type Runtime = typeof import("../../../../../apps/api/src/runtime.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import AppLayer = require("../../../../../apps/api/src/app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const { AppLayer } = require("../../../../../apps/api/src/app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const { AppLayer } = createRequire(import.meta.url)("../../../../../apps/api/src/app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../../../apps/api/src";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../../../apps/api/src/";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../../../apps/api/src/.";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../../../apps/api/src/index.ts";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { AppLayer } from "../../../../../apps/api/src/app.layer";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { answers } from "../../../../../apps/api/src/http";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { ShareLinks } from "../sharing/share-link.service";',
      filename: matcher,
      errors: [{ messageId: "module" }],
    },
    {
      code: 'import { Profiles } from "@/accounts/profiles/profile.service";',
      filename: matcher,
      errors: [{ messageId: "context" }],
    },
    {
      code: 'import { Profiles } from "../../accounts/profiles";',
      filename: matcher,
      errors: [{ messageId: "context" }],
    },
    {
      code: 'import { TagIndex } from "./tagging/tag-index";',
      filename: "packages/core/src/todos/todos.layer.ts",
      errors: [{ messageId: "module" }],
    },
    {
      code: 'export * from "../sharing/share-link.errors";',
      filename: matcher,
      errors: [{ messageId: "module" }],
    },
    {
      code: 'const m = await import("../sharing/share-link.service");',
      filename: matcher,
      errors: [{ messageId: "module" }],
    },
    {
      code: 'import { ShareLinkStub } from "../sharing/testing/index.ts";',
      filename: matcher,
      errors: [{ messageId: "testing" }],
    },
    {
      code: 'import { ShareLinkStub } from "../sharing/testing/share-link-stub.ts";',
      filename: "packages/core/src/todos/tagging/tag-index.test.ts",
      errors: [{ messageId: "module" }],
    },
    {
      code: 'import type { TodoStore } from "../../core/src/todos/todo.store.ts";',
      filename: adapter,
      options: platformOptions,
      errors: [{ messageId: "indexOnly" }],
    },
    {
      code: 'import { runConformance } from "../../core/src/todos/lists/testing/index.ts";',
      filename: adapter,
      options: platformOptions,
      errors: [{ messageId: "testing" }],
    },
  ],
});
