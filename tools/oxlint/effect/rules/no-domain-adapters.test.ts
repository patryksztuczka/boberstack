import { tester } from "../../rule-tester.ts";
import { noDomainAdaptersRule } from "./no-domain-adapters.ts";

const domain = "apps/api/src/modules/todos/todo-notifier.ts";

const platform = "apps/api/src/platform/authentication/better-auth.layer.ts";

tester.run("effect/no-domain-adapters", noDomainAdaptersRule, {
  valid: [
    { code: 'import { Context, Effect } from "effect";', filename: domain },
    { code: 'import type { Session } from "better-auth";', filename: domain },
    { code: 'import { type Database } from "@alchemy.run/sql";', filename: domain },
    { code: 'export type { Pool } from "pg";', filename: domain },
    { code: 'import { HttpApiBuilder } from "effect/http-api";', filename: domain },
    { code: 'import { TodosApi, TodoId } from "@boberstack/domain";', filename: domain },
    { code: 'import { format } from "pg-format";', filename: domain },
    { code: 'import { x } from "alchemy-utils";', filename: domain },
    { code: 'import { betterAuthLike } from "better-authority";', filename: domain },
    {
      code: 'import { TodoStore } from "./todo.store.ts";',
      filename: domain,
    },
    { code: 'import { betterAuth } from "better-auth";', filename: platform },
    { code: "const response = await fetch(url);", filename: platform },
    {
      code: 'import { FakeMailer } from "../../platform/mail/fake-mailer.ts";',
      filename: "apps/api/src/modules/todos/todo.service.test.ts",
    },
    { code: "const response = await client.fetch(url);", filename: domain },
    { code: "const options = { fetch: fetchWebhook };", filename: domain },
    { code: "type Send = { readonly fetch: typeof fetch };", filename: domain },
    { code: "class Client { fetch() { return 1; } }", filename: domain },
    { code: "const send = ({ fetch }: { fetch: Fetch }) => fetch(url);", filename: domain },
    {
      code: 'import { Resend } from "resend";',
      filename: domain,
      options: [{ vendors: ["@alchemy.run/*"] }],
    },
    { code: "const host = globalThis.location;", filename: domain },
    { code: "const { location } = globalThis;", filename: domain },
    { code: "const socket = new transport.WebSocket(url);", filename: domain },
    { code: "const window = { fetch: send };\nconst f = window.fetch;", filename: domain },
    {
      code: 'import { lookup } from "node:dns";',
      filename: domain,
      options: [{ network: ["http"] }],
    },
    { code: 'import type { IncomingMessage } from "node:http";', filename: domain },
    { code: "const name = await import(`./${file}.js`);", filename: domain },
    { code: 'import { Thing } from "#internal/thing";', filename: domain },
  ],
  invalid: [
    {
      code: "globalThis.fetch(url);",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "self.fetch(url);",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const response = await window.fetch(url);",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: 'globalThis["fetch"](url);',
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const { fetch } = globalThis;",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const socket = new WebSocket(url);",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const request = new XMLHttpRequest();",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const events = new EventSource(url);",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: 'import { request } from "node:https";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { request } from "http";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { connect } from "node:net";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { connect } from "node:http2";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { connect } from "node:tls";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { lookup } from "node:dns/promises";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { createSocket } from "node:dgram";',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'const https = require("node:https");',
      filename: domain,
      errors: [{ messageId: "network" }],
    },
    {
      code: 'import { Agent } from "undici";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { PgClient } from "@effect/sql-pg";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import * as Cloudflare from "alchemy/cloudflare";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { createRequire } from "node:module";\nconst adapter = createRequire(import.meta.url)("../../platform/mail/mailer.layer.ts");',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: "const adapter = await import(`../../platform/${name}.ts`);",
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: "const adapter = await import(`../../plat${name}.ts`);",
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'const adapter = await import("../../platform/" + name + ".ts");',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: "const sdk = await import(`@alchemy.run/${name}`);",
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { Mailer } from "#platform/mail/mailer.layer.ts";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { Mailer } from "@/platform/mail/mailer.layer.ts";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { Mailer } from "~adapters/mail.ts";',
      filename: domain,
      options: [{ platformAliases: ["~adapters/"] }],
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import { Cloudflare } from "@alchemy.run/cloudflare";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { Pool, type PoolConfig } from "pg";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { betterAuth } from "better-auth";',
      filename: "apps/api/src/modules/accounts/account.service.ts",
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { request } from "undici";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { drizzleAdapter } from "better-auth/adapters/drizzle";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'const { Neon } = await import("@alchemy.run/neon");',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'export { PgClient } from "@effect/sql-pg";',
      filename: domain,
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { Undici } from "undici";',
      filename: domain,
      options: [{ vendors: ["undici"] }],
      errors: [{ messageId: "vendor" }],
    },
    {
      code: 'import { BetterAuthLive } from "../../platform/authentication/better-auth.layer.ts";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'import type { DatabaseOptions } from "../../platform/database/database.layer.ts";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: 'export * from "../../platform/mail/mailer.layer.ts";',
      filename: domain,
      errors: [{ messageId: "platform" }],
    },
    {
      code: "const response = await fetch(url, { signal });",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const send = sendWebhook({ token, fetch });",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
    {
      code: "const response = await (fetch as typeof globalFetch)(url);",
      filename: domain,
      errors: [{ messageId: "global" }],
    },
  ],
});
