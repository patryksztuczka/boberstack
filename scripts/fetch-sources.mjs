import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseWorkspaceVersions } from "./check-doc-pins.mjs";

const SOURCES = [
  {
    name: "effect",
    repository: "https://github.com/Effect-TS/effect.git",
    tag: (version) => `effect@${version}`,
    read: "packages/effect/src, packages/effect/test, packages/*/src",
  },
  {
    name: "alchemy",
    repository: "https://github.com/alchemy-run/alchemy.git",
    tag: (version) => `v${version}`,
    read: "packages/alchemy/src, packages/*/src, examples/",
  },
  {
    name: "better-auth",
    repository: "https://github.com/better-auth/better-auth.git",
    tag: (version) => `v${version}`,
    read: "packages/better-auth/src, docs/content/docs",
  },
];

const checkoutName = (source, version) => `${source.name}@${version}`;

function plan(sources, versions, existing) {
  return sources.map((source) => {
    const version = [...(versions.get(source.name) ?? [])][0];

    if (version === undefined)
      throw new Error(`fetch-sources: ${source.name} is not in the catalog`);

    const directory = checkoutName(source, version);

    return {
      source,
      version,
      directory,
      fetch: !existing.includes(directory),
      stale: existing.filter((entry) => entry.startsWith(`${source.name}@`) && entry !== directory),
    };
  });
}

function git(args, cwd) {
  execFileSync("git", args, { cwd, stdio: ["ignore", "inherit", "inherit"] });
}

function main() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const target = join(root, ".repos");
  const versions = parseWorkspaceVersions(readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"));

  mkdirSync(target, { recursive: true });

  for (const step of plan(SOURCES, versions, readdirSync(target))) {
    for (const stale of step.stale) rmSync(join(target, stale), { recursive: true, force: true });

    if (step.fetch) {
      process.stdout.write(`fetch-sources: cloning ${step.directory}\n`);
      git(
        [
          "-c",
          "advice.detachedHead=false",
          "clone",
          "--quiet",
          "--depth",
          "1",
          "--branch",
          step.source.tag(step.version),
          step.source.repository,
          step.directory,
        ],
        target,
      );
    }

    const link = join(target, step.source.name);

    rmSync(link, { force: true });
    symlinkSync(step.directory, link);
    process.stdout.write(
      `fetch-sources: .repos/${step.source.name} -> ${step.directory} (read ${step.source.read})\n`,
    );
  }

  return existsSync(target) ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
