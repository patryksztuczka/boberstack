import { tester } from "../../rule-tester.ts";
import { noPlatformImportsRule } from "./no-platform-imports.ts";

const domain = "apps/api/src/modules/todos/todo-import.ts";

tester.run("effect/no-platform-imports", noPlatformImportsRule, {
  valid: [
    { code: 'import { Effect, FileSystem } from "effect";', filename: domain },
    { code: 'import { join } from "node:path";', filename: domain },
    { code: 'import type { FileHandle } from "node:fs/promises";', filename: domain },
    { code: 'import { type Stats } from "node:fs";', filename: domain },
    { code: 'export type { Stats } from "node:fs";', filename: domain },
    { code: 'export { type Stats } from "node:fs";', filename: domain },
    { code: 'const { join } = await import("node:path");', filename: domain },
    { code: 'const path = require("node:path");', filename: domain },
    { code: 'import type fs = require("fs");', filename: domain },
    { code: 'import { mkdtemp } from "node:fs/promises";', filename: "apps/api/src/main.ts" },
    {
      code: 'import { mkdtemp } from "node:fs/promises";',
      filename: "apps/api/src/modules/todos/todo-import.test.ts",
    },
    {
      code: 'import { writeFile } from "node:fs/promises";',
      filename: "apps/api/src/modules/todos/tests/fixture.ts",
    },
    {
      code: 'import { spawn } from "node:child_process";',
      filename: "apps/api/src/platform/job-dispatch/local-process-job-dispatcher.ts",
    },
    {
      code: 'import { spawn } from "node:child_process";',
      filename: "apps/api/src/modules/todos/worker-spawner.ts",
      options: [{ allow: ["apps/api/src/modules/todos/worker-spawner.ts"] }],
    },
  ],
  invalid: [
    {
      code: 'import { mkdtemp, rm } from "node:fs/promises";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { tmpdir } from "node:os";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { spawn } from "child_process";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import * as fs from "node:fs";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { open, type FileHandle } from "node:fs/promises";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'const { readFile } = await import("node:fs/promises");',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'export { readFile } from "node:fs/promises";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'export * from "node:os";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'const { spawn } = require("node:child_process");',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { createRequire } from "node:module";\nconst fs = createRequire(import.meta.url)("fs");',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import fs = require("fs");',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
  ],
});
