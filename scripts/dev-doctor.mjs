import { spawnSync } from "node:child_process";
import { readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { DATABASE_NAME, repositoryRoot } from "./dev-ports.mjs";
import { isAlive, readState } from "./dev.mjs";

const DEMO_USER = { name: "Demo", email: "demo@example.com", password: "demo12345" };

const MIGRATION_FILE = /^(\d+)_[^.]+\.sql$/;

function migrationIds(fileNames) {
  return fileNames
    .flatMap((fileName) => {
      const match = MIGRATION_FILE.exec(fileName);

      return match === null ? [] : [Number(match[1])];
    })
    .toSorted((left, right) => left - right);
}

const missingMigrations = (expected, applied) => expected.filter((id) => !applied.includes(id));

const cookieHeader = (setCookies) => setCookies.map((cookie) => cookie.split(";")[0]).join("; ");

const alreadyExists = (status, body) =>
  status >= 400 && status < 500 && body.includes("USER_ALREADY_EXISTS");

function compose(state, args) {
  return spawnSync("docker", ["compose", ...args], {
    cwd: state.root,
    env: { ...process.env, COMPOSE_PROJECT_NAME: state.composeProject },
    encoding: "utf8",
  });
}

async function request(url, init) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    ...init,
  });

  return { status: response.status, body: await response.text(), headers: response.headers };
}

const postJson = (url, body, headers) =>
  request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

async function check(results, name, run) {
  try {
    const detail = await run();

    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

const fail = (message) => {
  throw new Error(message);
};

async function healthOf(url) {
  const response = await request(`${url}/api/health`, {});

  if (response.status !== 200 || !response.body.includes('"ok"')) {
    fail(
      `GET ${url}/api/health answered ${String(response.status)} ${response.body.slice(0, 200)}`,
    );
  }

  return `GET ${url}/api/health → 200 ${response.body}`;
}

const VERIFY_LINK = /https?:\/\/\S*\/api\/auth\/verify-email\?\S+/;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const signInDemo = (web) =>
  postJson(
    `${web}/api/auth/sign-in/email`,
    { email: DEMO_USER.email, password: DEMO_USER.password },
    {},
  );

async function verificationLink(mailpit) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const search = await request(
      `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${DEMO_USER.email}`)}`,
      {},
    );

    const latest = JSON.parse(search.body).messages?.[0];

    if (latest !== undefined) {
      const message = JSON.parse(
        (await request(`${mailpit}/api/v1/message/${latest.ID}`, {})).body,
      );

      const link = VERIFY_LINK.exec(message.Text)?.[0];

      if (link !== undefined) return link;
    }

    await delay(250);
  }

  return fail(`no verification mail for ${DEMO_USER.email} in ${mailpit}`);
}

async function signedInCookie(web, mailpit) {
  const signUp = await postJson(`${web}/api/auth/sign-up/email`, DEMO_USER, {});

  if (signUp.status !== 200 && !alreadyExists(signUp.status, signUp.body)) {
    fail(`sign-up answered ${String(signUp.status)} ${signUp.body.slice(0, 200)}`);
  }

  let signIn = await signInDemo(web);
  let verified = false;

  if (signIn.status === 403 && signIn.body.includes("EMAIL_NOT_VERIFIED")) {
    const link = await verificationLink(mailpit);
    const confirmation = await request(link, {});

    if (confirmation.status >= 400) {
      fail(`the verification link answered ${String(confirmation.status)}`);
    }

    verified = true;
    signIn = await signInDemo(web);
  }

  if (signIn.status !== 200) {
    fail(`sign-in answered ${String(signIn.status)} ${signIn.body.slice(0, 200)}`);
  }

  return {
    verified,
    cookie: cookieHeader(signIn.headers.getSetCookie()),
  };
}

async function main() {
  const root = repositoryRoot();
  const state = readState(root);

  if (state === undefined || !isAlive(state.pid)) {
    process.stderr.write(
      "FAIL  pnpm dev is not running in this worktree (no live .dev/state.json)\n",
    );

    return 1;
  }

  const results = [];
  let session = undefined;

  await check(results, "launcher", () => {
    const dead = Object.entries(state.children).filter(([, pid]) => !isAlive(pid));

    if (dead.length > 0) fail(`dead: ${dead.map(([name]) => name).join(", ")}`);

    if (state.status !== "ready")
      fail(`status is "${String(state.status)}", wait for "dev: ready"`);

    return `pid ${String(state.pid)}, api ${String(state.children.api)}, web ${String(state.children.web)}`;
  });

  await check(results, "postgres", () => {
    const ready = compose(state, [
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-U",
      "postgres",
      "-d",
      DATABASE_NAME,
    ]);

    if (ready.status !== 0) fail(`${ready.stdout}${ready.stderr}`.trim());

    return `${state.urls.database} (compose project ${state.composeProject})`;
  });

  await check(results, "migrations", () => {
    const query = compose(state, [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      DATABASE_NAME,
      "-tAc",
      "select migration_id from effect_sql_migrations order by migration_id",
    ]);

    if (query.status !== 0) fail(`${query.stdout}${query.stderr}`.trim());

    const applied = query.stdout
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map(Number);

    const expected = migrationIds(readdirSync(join(root, "apps", "api", "migrations")));
    const missing = missingMigrations(expected, applied);

    if (missing.length > 0) fail(`not applied: ${missing.join(", ")}; run pnpm db:migrate`);

    return `applied ${applied.join(", ")}`;
  });

  await check(results, "mailpit", async () => {
    const info = await request(`${state.urls.mailpit}/api/v1/info`, {});

    if (info.status !== 200)
      fail(`GET ${state.urls.mailpit}/api/v1/info answered ${String(info.status)}`);

    return `${state.urls.mailpit} (Mailpit ${String(JSON.parse(info.body).Version)})`;
  });

  await check(results, "api", () => healthOf(state.urls.api));
  await check(results, "web proxy", () => healthOf(state.urls.web));

  await check(results, "web app", async () => {
    const page = await request(state.urls.web, {});

    if (page.status !== 200 || !page.body.includes('id="root"')) {
      fail(`GET ${state.urls.web} answered ${String(page.status)}`);
    }

    return `GET ${state.urls.web} → 200`;
  });

  await check(results, "demo user", async () => {
    session = await signedInCookie(state.urls.web, state.urls.mailpit);

    return `${DEMO_USER.email} / ${DEMO_USER.password}${session.verified ? " verified through the mail in Mailpit," : ""} sign-in 200`;
  });

  await check(results, "todos api", async () => {
    if (session === undefined) fail("skipped: no session");

    const todos = await request(`${state.urls.web}/api/todos`, {
      headers: { cookie: session.cookie },
    });

    if (todos.status !== 200) fail(`GET /api/todos answered ${String(todos.status)} ${todos.body}`);

    return `GET /api/todos as demo → 200, ${String(JSON.parse(todos.body).length)} todo(s)`;
  });

  for (const result of results) {
    process.stdout.write(`${result.ok ? "OK  " : "FAIL"}  ${result.name}: ${result.detail}\n`);
  }

  const failed = results.filter((result) => !result.ok).length;

  process.stdout.write(
    failed === 0
      ? `doctor: all ${String(results.length)} checks passed. Open ${state.urls.web}\n`
      : `doctor: ${String(failed)} of ${String(results.length)} checks failed. Logs: ${Object.values(state.logs).join(", ")}\n`,
  );

  return failed === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
