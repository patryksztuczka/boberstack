import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".scratch",
  ".repos",
  ".dev",
  ".alchemy",
  ".wrangler",
  "dist",
  "coverage",
]);

const WORKSPACE_SECTIONS = new Set(["catalog", "catalogs", "overrides"]);

const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const NPM_ALIAS = /^npm:(?:@[^@/\s]+\/)?[^@\s]+@(?<version>.+)$/;

const LOCAL_PROTOCOL = /^(?:link|file):/;

const CATALOG_PROTOCOL = /^catalog:[\w.-]*$/;

const PINNED_ACTION = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/;

const USES_LINE = /^\s*(?:-\s+)?uses:\s*(?<quote>["']?)(?<ref>[^"'\s#]+)\k<quote>/;

function isExactVersion(specifier) {
  if (specifier === "workspace:*") return true;

  if (CATALOG_PROTOCOL.test(specifier) || LOCAL_PROTOCOL.test(specifier)) return true;

  const alias = NPM_ALIAS.exec(specifier);

  if (alias !== null) return EXACT_SEMVER.test(alias.groups.version);

  return EXACT_SEMVER.test(specifier);
}

function unquote(text) {
  const trimmed = text.trim();

  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'")) {
    if (trimmed.at(-1) === trimmed[0]) return trimmed.slice(1, -1);
  }

  return trimmed;
}

function withoutComment(line) {
  let quote = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quote !== null) {
      if (character === quote) quote = null;

      continue;
    }

    if (character === '"' || character === "'") quote = character;
    else if (character === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }

  return line;
}

function splitKeyValue(text) {
  const match = /^(?<key>"[^"]*"|'[^']*'|[^:]+):(?:\s+(?<value>.*))?$/.exec(text.trim());

  if (match === null) return null;

  return { key: unquote(match.groups.key), value: unquote(match.groups.value ?? "") };
}

function workspaceVersionEntries(text) {
  const entries = [];
  let section = null;
  let catalogName = null;

  for (const [index, rawLine] of text.split("\n").entries()) {
    const line = withoutComment(rawLine).trimEnd();

    if (line.trim() === "") continue;

    const indent = line.length - line.trimStart().length;
    const pair = splitKeyValue(line);

    if (indent === 0) {
      section =
        pair !== null && pair.value === "" && WORKSPACE_SECTIONS.has(pair.key) ? pair.key : null;
      catalogName = null;

      continue;
    }

    if (section === null || pair === null) continue;

    if (section === "catalogs" && pair.value === "") {
      catalogName = pair.key;

      continue;
    }

    if (pair.value === "") continue;

    const label = section === "catalogs" ? `catalogs.${catalogName}` : section;

    entries.push({ line: index + 1, label: `${label}.${pair.key}`, version: pair.value });
  }

  return entries;
}

function actionRefProblem(ref) {
  if (ref.startsWith("./")) return null;

  if (ref.startsWith("docker://")) {
    return ref.includes("@sha256:") ? null : "pin the image with @sha256:<digest>";
  }

  if (PINNED_ACTION.test(ref)) return null;

  return "pin the action to a full 40-character commit SHA and keep the tag in a trailing # vX.Y.Z comment";
}

function walk(directory, visit) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;

    const path = join(directory, entry.name);

    if (entry.isDirectory()) walk(path, visit);
    else if (entry.isFile()) visit(path, entry.name);
  }
}

function packageJsonViolations(root) {
  const violations = [];

  walk(root, (path, name) => {
    if (name !== "package.json") return;

    const manifest = JSON.parse(readFileSync(path, "utf8"));

    for (const field of DEPENDENCY_FIELDS) {
      for (const [dependency, version] of Object.entries(manifest[field] ?? {})) {
        if (isExactVersion(version)) continue;

        violations.push(`${relative(root, path)}: ${field}.${dependency} uses "${version}"`);
      }
    }
  });

  return violations;
}

function workspaceViolations(root) {
  const path = join(root, "pnpm-workspace.yaml");

  if (!existsSync(path)) return [];

  const violations = [];

  for (const entry of workspaceVersionEntries(readFileSync(path, "utf8"))) {
    if (isExactVersion(entry.version)) continue;

    violations.push(`pnpm-workspace.yaml:${entry.line}: ${entry.label} uses "${entry.version}"`);
  }

  return violations;
}

function actionViolations(root) {
  const directory = join(root, ".github");

  if (!existsSync(directory)) return [];

  const violations = [];

  walk(directory, (path, name) => {
    if (!/\.ya?ml$/.test(name)) return;

    for (const [index, line] of readFileSync(path, "utf8").split("\n").entries()) {
      const match = USES_LINE.exec(line);

      if (match === null) continue;

      const problem = actionRefProblem(match.groups.ref);

      if (problem === null) continue;

      violations.push(`${relative(root, path)}:${index + 1}: uses ${match.groups.ref}: ${problem}`);
    }
  });

  return violations;
}

function findViolations(root) {
  return [...packageJsonViolations(root), ...workspaceViolations(root), ...actionViolations(root)];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootFlag = process.argv.indexOf("--root");
  const root = resolve(rootFlag === -1 ? process.cwd() : process.argv[rootFlag + 1]);
  const violations = findViolations(root);

  if (violations.length > 0) {
    process.stderr.write(
      "Dependency versions and GitHub Action refs must be pinned exactly " +
        '(dependencies: exact x.y.z, "workspace:*" or "catalog:"; actions: full commit SHA):\n' +
        violations.map((violation) => `- ${violation}\n`).join(""),
    );
    process.exitCode = 1;
  }
}
