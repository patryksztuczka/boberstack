import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import { repositoryRoot } from "./dev-ports.mjs";

const IMAGE = "boberstack-api:check";

const POSTGRES_IMAGE = "postgres:17-alpine";

const HOST_PORT = 39_300;

const READY_TIMEOUT_MS = 60_000;

const CHECKS = [
  { path: "/api/health", status: 200, contentType: "application/json" },
  { path: "/api/auth/get-session", status: 200, contentType: "application/json" },
  { path: "/", status: 200, contentType: "text/html", accept: "text/html" },
  { path: "/todos", status: 200, contentType: "text/html", accept: "text/html" },
];

const suffix = randomBytes(4).toString("hex");

const network = `api-image-${suffix}`;

const database = `api-image-db-${suffix}`;

const api = `api-image-api-${suffix}`;

function docker(args, { quiet = false } = {}) {
  const result = spawnSync("docker", args, {
    cwd: repositoryRoot(),
    encoding: "utf8",
    stdio: quiet ? "pipe" : ["ignore", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    throw new Error(`docker ${args.join(" ")} failed${quiet ? `\n${result.stderr}` : ""}`);
  }

  return result.stdout ?? "";
}

function cleanUp() {
  for (const args of [
    ["rm", "--force", api],
    ["rm", "--force", database],
    ["network", "rm", network],
  ]) {
    spawnSync("docker", args, { stdio: "ignore" });
  }
}

const delay = (milliseconds) =>
  new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });

async function waitForHealth() {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const answered = await fetch(`http://localhost:${String(HOST_PORT)}/api/health`).then(
      (response) => response.ok,
      () => false,
    );

    if (answered) return true;

    await delay(1_000);
  }

  return false;
}

async function check({ path, status, contentType, accept }) {
  const response = await fetch(`http://localhost:${String(HOST_PORT)}${path}`, {
    headers: accept === undefined ? {} : { accept },
  });

  const type = response.headers.get("content-type") ?? "";

  if (response.status !== status || !type.startsWith(contentType)) {
    return `${path}: expected ${String(status)} ${contentType}, got ${String(response.status)} ${type}`;
  }

  return undefined;
}

async function main() {
  docker(["build", "--file", "apps/infra/api.Dockerfile", "--tag", IMAGE, "."]);
  docker(["network", "create", network], { quiet: true });
  docker(
    [
      "run",
      "--detach",
      "--name",
      database,
      "--network",
      network,
      "--env",
      "POSTGRES_PASSWORD=postgres",
      "--env",
      "POSTGRES_DB=app",
      POSTGRES_IMAGE,
    ],
    { quiet: true },
  );
  docker(
    [
      "run",
      "--detach",
      "--name",
      api,
      "--network",
      network,
      "--publish",
      `${String(HOST_PORT)}:3000`,
      "--env",
      `DATABASE_URL=postgres://postgres:postgres@${database}:5432/app`,
      "--env",
      `AUTH_SECRET=${randomBytes(32).toString("hex")}`,
      "--env",
      `AUTH_BASE_URL=http://localhost:${String(HOST_PORT)}`,
      "--env",
      "MAIL_TRANSPORT=mailpit",
      "--env",
      "MAILPIT_URL=http://mailpit.invalid:8025",
      IMAGE,
    ],
    { quiet: true },
  );

  if (!(await waitForHealth())) {
    process.stderr.write(docker(["logs", api], { quiet: true }));
    throw new Error(
      `the api image did not answer /api/health within ${String(READY_TIMEOUT_MS)} ms`,
    );
  }

  const failures = (await Promise.all(CHECKS.map(check))).filter(
    (failure) => failure !== undefined,
  );

  if (failures.length > 0) {
    process.stderr.write(docker(["logs", api], { quiet: true }));
    throw new Error(`the api image answered wrong:\n${failures.join("\n")}`);
  }

  process.stdout.write(
    `api-image: ${IMAGE} serves the api and the web app (${String(CHECKS.length)} checks)\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(`api-image: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  cleanUp();
}
