import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { devEnvironment, PORT_VARIABLES, repositoryRoot } from "./dev-ports.mjs";

const READY_TIMEOUT_MS = 180_000;

const STOP_GRACE_MS = 5_000;

const USAGE =
  "Usage: node scripts/dev.mjs [up|stop|status|ports|db:up|db:migrate|db:down]\n" +
  "  up          Postgres, migrations, the api Worker and the web app (default)\n" +
  "  stop        stops a pnpm dev started from this worktree\n" +
  "  status      prints .dev/state.json when pnpm dev is running\n" +
  "  ports       prints the ports and URLs this worktree uses, without starting anything\n" +
  "  db:up       starts this worktree's Postgres container\n" +
  "  db:migrate  applies apps/api/migrations to it\n" +
  "  db:down     stops the container and keeps its volume\n" +
  "  cli ...     runs the CLI (apps/cli) with this worktree's DATABASE_URL and api port\n";

const statePath = (root) => join(root, ".dev", "state.json");

const logPath = (root, name) => join(root, ".dev", "logs", `${name}.log`);

export function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}

export function readState(root) {
  const path = statePath(root);

  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

const runningState = (root) => {
  const state = readState(root);

  return state !== undefined && isAlive(state.pid) ? state : undefined;
};

const writeState = (root, state) =>
  writeFileSync(statePath(root), `${JSON.stringify(state, undefined, 2)}\n`);

const portIsFree = (port) =>
  new Promise((resolvePort) => {
    const server = createServer();

    server.once("error", () => resolvePort(false));
    server.listen({ port, host: "localhost", exclusive: true }, () => {
      server.close(() => resolvePort(true));
    });
  });

const delay = (milliseconds) =>
  new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });

function runLogged(root, command, args, variables, log) {
  log.write(`$ ${[command, ...args].join(" ")}\n`);

  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...variables },
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  log.write(output);
  process.stdout.write(output);

  return result.status ?? 1;
}

const composeUp = (root, variables, log) =>
  runLogged(root, "docker", ["compose", "up", "--detach", "--wait"], variables, log);

const migrate = (root, variables, log) =>
  runLogged(
    root,
    "pnpm",
    ["--silent", "--filter", "@boberstack/cli", "start", "db", "migrate"],
    variables,
    log,
  );

function prefixLines(prefix, stream, target, log) {
  let pending = "";

  stream.on("data", (chunk) => {
    const text = chunk.toString("utf8");

    log.write(text);

    const lines = `${pending}${text}`.split("\n");

    pending = lines.pop() ?? "";

    for (const line of lines) target.write(`${prefix} ${line}\n`);
  });

  stream.on("end", () => {
    if (pending !== "") target.write(`${prefix} ${pending}\n`);
  });
}

function startChild(root, name, args, variables) {
  const log = createWriteStream(logPath(root, name), { flags: "w" });

  const child = spawn("pnpm", args, {
    cwd: root,
    env: { ...process.env, ...variables },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  prefixLines(`[${name}]`, child.stdout, process.stdout, log);
  prefixLines(`[${name}]`, child.stderr, process.stderr, log);

  return child;
}

function signalGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    return false;
  }

  return true;
}

async function stopChildren(pids) {
  const running = pids.filter(isAlive);

  for (const pid of running) signalGroup(pid, "SIGTERM");

  const deadline = Date.now() + STOP_GRACE_MS;

  while (Date.now() < deadline && running.some(isAlive)) await delay(100);

  for (const pid of running) signalGroup(pid, "SIGKILL");
}

async function answers(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });

    return response.ok;
  } catch {
    return false;
  }
}

async function waitUntilReady(urls, children) {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (children.some((child) => child.exitCode !== null)) return false;

    if ((await answers(`${urls.api}/api/health`)) && (await answers(`${urls.web}/api/health`))) {
      return true;
    }

    await delay(500);
  }

  return false;
}

function prepareDatabase(root, variables) {
  mkdirSync(join(root, ".dev", "logs"), { recursive: true });

  const log = createWriteStream(logPath(root, "db"), { flags: "w" });

  if (composeUp(root, variables, log) !== 0) {
    process.stderr.write(
      `dev: Postgres or Mailpit did not start (log: ${logPath(root, "db")}). If port ${variables[PORT_VARIABLES.postgres]} is taken, set ${PORT_VARIABLES.postgres}.\n`,
    );
    log.end();

    return 1;
  }

  const status = migrate(root, variables, log);

  log.end();

  return status;
}

async function up(root) {
  const running = runningState(root);

  if (running !== undefined) {
    process.stdout.write(
      `dev: already running (pid ${String(running.pid)}): web ${running.urls.web}, api ${running.urls.api}\n`,
    );

    return 0;
  }

  const environment = devEnvironment(root, process.env);
  const { ports, urls, variables } = environment;

  for (const service of ["web", "api"]) {
    if (!(await portIsFree(ports[service]))) {
      process.stderr.write(
        `dev: port ${String(ports[service])} (${service}) is taken. Stop what holds it or set ${PORT_VARIABLES[service]}.\n`,
      );

      return 1;
    }
  }

  process.stdout.write(
    `dev: worktree ${root}\ndev: web ${urls.web}, api ${urls.api}, mail ${urls.mailpit}, postgres ${urls.database} (compose project ${environment.composeProject})\n`,
  );

  if (prepareDatabase(root, variables) !== 0) return 1;

  const api = startChild(root, "api", ["--filter", "@boberstack/infra", "run", "dev"], variables);
  const web = startChild(root, "web", ["--filter", "@boberstack/web", "run", "dev"], variables);
  const children = [api, web];

  const state = {
    status: "starting",
    pid: process.pid,
    root,
    composeProject: environment.composeProject,
    ports,
    urls,
    children: { api: api.pid, web: web.pid },
    logs: { db: logPath(root, "db"), api: logPath(root, "api"), web: logPath(root, "web") },
    startedAt: new Date().toISOString(),
  };

  writeState(root, state);

  let stopping = false;

  const shutdown = async (code) => {
    if (stopping) return;

    stopping = true;
    await stopChildren(children.map((child) => child.pid ?? -1));
    rmSync(statePath(root), { force: true });
    process.exit(code);
  };

  process.on("SIGINT", () => void shutdown(130));
  process.on("SIGTERM", () => void shutdown(143));

  for (const child of children) {
    child.on("exit", (code) => {
      if (stopping) return;

      process.stderr.write(`dev: a child exited with code ${String(code)}; stopping the rest\n`);
      void shutdown(1);
    });
  }

  if (await waitUntilReady(urls, children)) {
    writeState(root, { ...state, status: "ready" });
    process.stdout.write(
      `dev: ready. Open ${urls.web}; mail lands in ${urls.mailpit}. State in .dev/state.json, logs in .dev/logs/. Stop with Ctrl-C or pnpm dev:stop.\n`,
    );
  } else if (!stopping) {
    process.stderr.write("dev: the api or the web app did not answer /api/health in time\n");
    await shutdown(1);
  }

  return 0;
}

async function stop(root) {
  const state = readState(root);

  if (state === undefined) {
    process.stdout.write("dev: not running\n");

    return 0;
  }

  if (isAlive(state.pid)) process.kill(state.pid, "SIGTERM");

  await stopChildren(Object.values(state.children ?? {}));

  const deadline = Date.now() + STOP_GRACE_MS;

  while (Date.now() < deadline && isAlive(state.pid)) await delay(100);

  rmSync(statePath(root), { force: true });
  process.stdout.write("dev: stopped\n");

  return 0;
}

function database(root, task) {
  const { variables } = devEnvironment(root, process.env);

  if (task === "db:down") {
    return (
      spawnSync("docker", ["compose", "down"], {
        cwd: root,
        env: { ...process.env, ...variables },
        stdio: "inherit",
      }).status ?? 1
    );
  }

  mkdirSync(join(root, ".dev", "logs"), { recursive: true });

  const log = createWriteStream(logPath(root, "db"), { flags: "a" });
  const status = task === "db:up" ? composeUp(root, variables, log) : migrate(root, variables, log);

  log.end();

  return status;
}

async function main(argv) {
  const root = repositoryRoot();
  const task = argv[0] ?? "up";

  if (task === "up") return up(root);

  if (task === "stop") return stop(root);

  if (task === "status") {
    const state = runningState(root);

    process.stdout.write(
      state === undefined ? "dev: not running\n" : `${JSON.stringify(state, undefined, 2)}\n`,
    );

    return state === undefined ? 1 : 0;
  }

  if (task === "ports") {
    process.stdout.write(`${JSON.stringify(devEnvironment(root, process.env), undefined, 2)}\n`);

    return 0;
  }

  if (task === "db:up" || task === "db:migrate" || task === "db:down") return database(root, task);

  if (task === "cli") {
    const result = spawnSync(
      "pnpm",
      [
        "--silent",
        "--filter",
        "@boberstack/cli",
        "start",
        ...argv.slice(1).filter((argument) => argument !== "--"),
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, ...devEnvironment(root, process.env).variables },
      },
    );

    return result.status ?? 1;
  }

  process.stderr.write(USAGE);

  return 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`dev: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
