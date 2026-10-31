import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FIRST_PORT = 20_000;

const PORTS_PER_SLOT = 10;

const SLOTS = 1_000;

export const PORT_VARIABLES = {
  web: "DEV_WEB_PORT",
  api: "DEV_API_PORT",
  postgres: "DEV_POSTGRES_PORT",
};

const OFFSETS = { web: 0, api: 1, postgres: 2 };

export const DATABASE_NAME = "app";

export const repositoryRoot = () => realpathSync(fileURLToPath(new URL("..", import.meta.url)));

const rootHash = (root) => createHash("sha256").update(resolve(root)).digest("hex");

const slotOf = (root) => Number.parseInt(rootHash(root).slice(0, 8), 16) % SLOTS;

function composeProjectName(root) {
  const readable = basename(resolve(root))
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, "-")
    .slice(0, 40)
    .replaceAll(/^[-_]+|[-_]+$/g, "");

  return `${readable === "" ? "dev" : readable}-${rootHash(root).slice(0, 8)}`;
}

function parsePort(name, value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be a port number between 1 and 65535, got "${value}"`);
  }

  return port;
}

function devPorts(root, environment) {
  const base = FIRST_PORT + slotOf(root) * PORTS_PER_SLOT;
  const ports = {};

  for (const [service, variable] of Object.entries(PORT_VARIABLES)) {
    const override = environment[variable];

    ports[service] =
      override === undefined || override === ""
        ? base + OFFSETS[service]
        : parsePort(variable, override);
  }

  return ports;
}

export function devEnvironment(root, environment) {
  const ports = devPorts(root, environment);
  const databaseUrl = `postgres://postgres:postgres@localhost:${String(ports.postgres)}/${DATABASE_NAME}`;

  return {
    ports,
    composeProject: composeProjectName(root),
    urls: {
      web: `http://localhost:${String(ports.web)}`,
      api: `http://localhost:${String(ports.api)}`,
      database: databaseUrl,
    },
    variables: {
      [PORT_VARIABLES.web]: String(ports.web),
      [PORT_VARIABLES.api]: String(ports.api),
      [PORT_VARIABLES.postgres]: String(ports.postgres),
      COMPOSE_PROJECT_NAME: composeProjectName(root),
      DATABASE_URL: databaseUrl,
      AUTH_BASE_URL: `http://localhost:${String(ports.api)}`,
    },
  };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(
    `${JSON.stringify(devEnvironment(repositoryRoot(), process.env), undefined, 2)}\n`,
  );
}
