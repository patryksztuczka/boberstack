import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_MENTION =
  /(?<scope>@[a-z0-9][\w.-]*\/)?(?<name>[a-z0-9][\w.-]*)@(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]*[0-9A-Za-z])?)/g;

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies"];

const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function addVersion(versions, name, version) {
  if (!EXACT.test(version)) return;

  versions.set(name, new Set([...(versions.get(name) ?? []), version]));
}

export function parseWorkspaceVersions(yaml) {
  const versions = new Map();
  let section = null;

  for (const line of yaml.split("\n")) {
    const header = /^(?<key>[\w-]+):\s*$/.exec(line);

    if (header !== null) {
      section = header.groups.key;
      continue;
    }

    if (/^\S/.test(line)) section = null;

    if (section !== "catalog" && section !== "overrides") continue;

    const entry = /^\s+["']?(?<name>[^"':\s]+)["']?:\s*["']?(?<version>[^"'\s#]+)/.exec(line);

    if (entry !== null) addVersion(versions, entry.groups.name, entry.groups.version);
  }

  return versions;
}

function actualVersions(root, manifestPaths) {
  const versions = parseWorkspaceVersions(readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"));

  addVersion(versions, "node", readFileSync(join(root, ".node-version"), "utf8").trim());

  for (const path of manifestPaths) {
    const manifest = JSON.parse(readFileSync(join(root, path), "utf8"));

    const packageManager = /^(?<name>[\w-]+)@(?<version>\S+)$/.exec(manifest.packageManager ?? "");

    if (packageManager !== null) {
      addVersion(versions, packageManager.groups.name, packageManager.groups.version);
    }

    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, version] of Object.entries(manifest[field] ?? {})) {
        addVersion(versions, name, version);
      }
    }
  }

  return versions;
}

function findDrift(documents, versions) {
  const problems = [];

  for (const { path, text } of documents) {
    for (const [index, line] of text.split("\n").entries()) {
      for (const match of line.matchAll(VERSION_MENTION)) {
        const name = `${match.groups.scope ?? ""}${match.groups.name}`;
        const actual = versions.get(name);

        if (actual !== undefined && !actual.has(match.groups.version)) {
          problems.push(
            `${path}:${index + 1}: mentions ${name}@${match.groups.version}, the workspace has ${[...actual].join(", ")}`,
          );
        }
      }
    }
  }

  return problems;
}

function trackedFiles(root, patterns) {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", ...patterns],
    {
      cwd: root,
      encoding: "utf8",
    },
  )
    .split("\n")
    .filter((line) => line !== "" && existsSync(join(root, line)));
}

function main() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const versions = actualVersions(root, trackedFiles(root, ["package.json", "**/package.json"]));

  const documents = trackedFiles(root, ["*.md", "**/*.md"]).map((path) => ({
    path,
    text: readFileSync(join(root, path), "utf8"),
  }));

  const problems = findDrift(documents, versions);

  if (problems.length === 0) {
    process.stdout.write(`check-doc-pins: ${documents.length} documents agree with the pins\n`);

    return 0;
  }

  process.stderr.write(
    `check-doc-pins: documentation disagrees with the installed versions. Fix the document, or the pin if the document is right:\n${problems.map((problem) => `  ${problem}`).join("\n")}\n`,
  );

  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
