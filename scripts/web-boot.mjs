import { execFile } from "node:child_process";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { repositoryRoot } from "./dev-ports.mjs";

const run = promisify(execFile);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const SIGNED_OUT_API = new Map([
  ["/api/auth/get-session", null],
  [
    "/api/sign-in-methods",
    { emailVerificationRequired: true, socialProviders: ["github", "google"] },
  ],
]);

const PAGES = [
  { path: "/", element: 'a[href="/sign-up"]', landsOn: "/" },
  { path: "/todos", element: 'input[type="email"]', landsOn: "/sign-in?redirectTo=%2Ftodos" },
  { path: "/no-such-page", element: 'img[src*="not-found"]', landsOn: "/no-such-page" },
];

function assetPath(dist, pathname) {
  const file = normalize(join(dist, decodeURIComponent(pathname)));
  const inside = file.startsWith(`${dist}${sep}`);

  return inside && statSync(file, { throwIfNoEntry: false })?.isFile() === true ? file : undefined;
}

function serve(dist, unexpectedApiCalls) {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://web-boot.local");

    if (SIGNED_OUT_API.has(pathname)) {
      response
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify(SIGNED_OUT_API.get(pathname)));

      return;
    }

    if (pathname.startsWith("/api/") || pathname.startsWith("/.well-known/")) {
      unexpectedApiCalls.push(`${request.method ?? "GET"} ${pathname}`);
      response.writeHead(503).end();

      return;
    }

    const file = assetPath(dist, pathname) ?? join(dist, "index.html");

    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const browserCommand = (root, session) => async (args) => {
  const binary = join(root, "node_modules", ".bin", "agent-browser");
  const { stdout } = await run(binary, [...args, "--session", session, "--json"]);

  return JSON.parse(stdout);
};

async function visit(browser, origin, page) {
  await browser(["open", `${origin}${page.path}`]);
  await browser(["wait", page.element]);

  const location = new URL((await browser(["get", "url"])).data.url);
  const landedOn = `${location.pathname}${location.search}`;

  if (landedOn !== page.landsOn) {
    throw new Error(`landed on ${landedOn}, expected ${page.landsOn}`);
  }

  return `${page.path} → ${landedOn} shows ${page.element}`;
}

function describeFailure(error) {
  try {
    return JSON.parse(error.stdout).error ?? error.message;
  } catch {
    return [error.stderr, error.message].filter(Boolean).join(" ").trim();
  }
}

const noneOf = (what, texts) =>
  texts.length === 0
    ? { ok: true, detail: `no ${what}` }
    : { ok: false, detail: `${what}:\n${texts.map((text) => `      ${text}`).join("\n")}` };

async function main() {
  const root = repositoryRoot();
  const dist = join(root, "apps", "web", "dist");

  if (!existsSync(join(dist, "index.html"))) {
    process.stderr.write(`FAIL  no web build at ${dist}. Run pnpm build first.\n`);

    return 1;
  }

  const unexpectedApiCalls = [];
  const server = await serve(dist, unexpectedApiCalls);
  const origin = `http://127.0.0.1:${String(server.address().port)}`;
  const browser = browserCommand(root, `web-boot-${String(process.pid)}`);
  const results = [];

  try {
    for (const page of PAGES) {
      try {
        results.push({ ok: true, detail: await visit(browser, origin, page) });
      } catch (error) {
        results.push({ ok: false, detail: `${page.path}: ${describeFailure(error)}` });
      }
    }

    const pageErrors = (await browser(["errors"])).data.errors ?? [];

    const consoleErrors = ((await browser(["console"])).data.messages ?? []).filter(
      (message) => message.type === "error",
    );

    results.push(
      noneOf(
        "uncaught page errors",
        pageErrors.map((error) => error.text),
      ),
      noneOf(
        "console errors",
        consoleErrors.map((message) => message.text),
      ),
      noneOf("api calls besides the signed-out ones it answers", unexpectedApiCalls),
    );
  } finally {
    await browser(["close"]).catch(() => undefined);
    server.close();
  }

  for (const result of results) {
    process.stdout.write(`${result.ok ? "OK  " : "FAIL"}  ${result.detail}\n`);
  }

  const failed = results.filter((result) => !result.ok).length;

  process.stdout.write(
    failed === 0
      ? `web-boot: the built web client booted on all ${String(PAGES.length)} pages\n`
      : `web-boot: ${String(failed)} of ${String(results.length)} checks failed\n`,
  );

  return failed === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
