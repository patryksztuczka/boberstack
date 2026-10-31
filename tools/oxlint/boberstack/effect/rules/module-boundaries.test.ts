import { tester } from "../../../rule-tester.ts";
import { moduleBoundariesRule } from "./module-boundaries.ts";

const matcher = "apps/api/src/modules/todos/tagging/tag-index.ts";

const adapter = "apps/api/src/platform/mail/smtp-mailer.ts";

const platformOptions = [{ indexOnly: ["apps/*/src/platform/**"] }];

const reference = "apps/api/src/modules/todos/sharing/share-link.constants.ts";

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
      filename: "apps/api/src/modules/todos/todos.layer.ts",
    },
    { code: 'import { x } from "../other/deep/file";', filename: "scripts/tool.ts" },
    {
      code: 'import { ShareLinkStub } from "../sharing/testing";',
      filename: "apps/api/src/modules/todos/tagging/tag-index.test.ts",
    },
    {
      code: 'import { ShareLinkStub } from "../sharing/testing/index.ts";',
      filename: "apps/api/src/modules/todos/tagging/tag-index.test.ts",
    },
    {
      code: 'import { ShareLinkStub } from "../../sharing/testing/index.ts";',
      filename: "apps/api/src/modules/todos/tagging/testing/tag-index-suite.ts",
    },
    {
      code: 'import { ShareLinkStub } from "../../sharing/testing/index.ts";',
      filename: "apps/api/src/modules/todos/tagging/tests/tag-world.ts",
    },
    {
      code: 'import { TodoStore } from "../../modules/todos/lists/index.ts";',
      filename: adapter,
      options: platformOptions,
    },
    {
      code: 'import { runConformance } from "../../modules/todos/lists/testing/index.ts";',
      filename: "apps/api/src/platform/mail/smtp-mailer.integration.test.ts",
      options: platformOptions,
    },
    {
      code: 'import { DatabaseConnection } from "../database/database-connection.ts";',
      filename: adapter,
      options: platformOptions,
    },
    {
      code: 'import { ReminderClock } from "./modules/todos/reminders/reminder-clock.ts";',
      filename: "apps/api/src/app.layer.ts",
      options: platformOptions,
    },
    {
      code: 'import { parseQuery } from "../../../http/query.ts";',
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'import { runEffect } from "./runtime.ts";',
      filename: "apps/api/src/api-server.ts",
      options: rootOptions,
    },
    {
      code: 'import { NodeEnvironment } from "../../../node-environment.ts";',
      filename: reference,
      options: [{ rootFiles: [] }],
    },
    {
      code: "const loaded = await import(name);",
      filename: reference,
      options: [{ rootFiles: [] }],
    },
    {
      code: 'const query = await import("../../../http/" + name);',
      filename: reference,
      options: rootOptions,
    },
    {
      code: "const query = await import(`../../../http/${name}`);",
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'import { answers } from "../../../http/";',
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'import { answers } from "../../../http/index.ts";',
      filename: reference,
      options: rootOptions,
    },
    {
      code: 'const { layerTestConfig } = require("../../../testing/test-config.ts");',
      filename: "apps/api/src/modules/todos/sharing/share-link.test.ts",
      options: rootOptions,
    },
    {
      code: 'type Env = typeof import("../../../platform/environment/worker-environment.ts");',
      filename: "apps/api/src/modules/todos/sharing/share-link.test.ts",
      options: rootOptions,
    },
    {
      code: 'import config = require("../../../testing/test-config.ts");',
      filename: "apps/api/src/modules/todos/sharing/share-link.test.ts",
      options: rootOptions,
    },
  ],
  invalid: [
    {
      code: 'import { NodeEnvironment } from "../../../node-environment.ts";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'export { CorsPolicy } from "../../origin-policy.ts";',
      filename: "apps/api/src/modules/accounts/index.ts",
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const tracing = await import("../../../tracing.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { AppLayer } from "../../../../app.layer.ts";',
      filename: "apps/api/src/modules/todos/sharing/tests/share-link.test.ts",
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const root = await import("../../../" + "app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const root = await import("../../" + "../" + "runtime.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const root = await import("../../../" + name);',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFileDynamic" }],
    },
    {
      code: "const root = await import(`../../../${name}.ts`);",
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFileDynamic" }],
    },
    {
      code: 'const root = require("../../../app" + suffix);',
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
      code: 'type Runtime = typeof import("../../../runtime.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import AppLayer = require("../../../app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const { AppLayer } = require("../../../app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'const { AppLayer } = createRequire(import.meta.url)("../../../app.layer.ts");',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../..";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../.";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import * as root from "../../../index.ts";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { AppLayer } from "../../../app.layer";',
      filename: reference,
      options: rootOptions,
      errors: [{ messageId: "rootFile" }],
    },
    {
      code: 'import { answers } from "../../../http";',
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
      filename: "apps/api/src/modules/todos/todos.layer.ts",
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
      filename: "apps/api/src/modules/todos/tagging/tag-index.test.ts",
      errors: [{ messageId: "module" }],
    },
    {
      code: 'import type { TodoStore } from "../../modules/todos/todo.store.ts";',
      filename: adapter,
      options: platformOptions,
      errors: [{ messageId: "indexOnly" }],
    },
    {
      code: 'import { runConformance } from "../../modules/todos/lists/testing/index.ts";',
      filename: adapter,
      options: platformOptions,
      errors: [{ messageId: "testing" }],
    },
  ],
});
