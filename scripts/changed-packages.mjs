import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const GLOBAL_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.base.json",
  ".node-version",
  "scripts/changed-packages.mjs",
]);

const GLOBAL_PREFIXES = ["tools/oxlint/", ".github/"];

const DOCS_PREFIXES = ["docs/", ".agents/"];

const NULL_SHA = /^0+$/;

export function isDocsOnly(file) {
  return file.endsWith(".md") || DOCS_PREFIXES.some((prefix) => file.startsWith(prefix));
}

export function affectsEverything(file) {
  return GLOBAL_FILES.has(file) || GLOBAL_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function planTests(changedFiles) {
  const code = changedFiles.filter((file) => !isDocsOnly(file));

  if (code.length === 0) return { mode: "none", reason: "only documentation changed" };

  const global = code.find(affectsEverything);

  if (global !== undefined) return { mode: "all", reason: `${global} affects every package` };

  return { mode: "changed", reason: `${code.length} changed file(s) outside documentation` };
}

function resolveBase(explicitBase, environment) {
  if (explicitBase !== undefined) return explicitBase;

  if (environment.GITHUB_BASE_REF) return `origin/${environment.GITHUB_BASE_REF}`;

  const before = environment.CHANGED_SINCE ?? "";

  if (before !== "" && !NULL_SHA.test(before)) return before;

  return "HEAD^";
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function commitExists(root, ref) {
  try {
    git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);

    return true;
  } catch {
    return false;
  }
}

function changedFiles(root, base) {
  return git(root, ["diff", "--name-only", base])
    .split("\n")
    .filter((line) => line !== "");
}

function listProjects(root, filter) {
  const output = execFileSync("pnpm", ["ls", "--recursive", ...filter, "--depth", "-1", "--json"], {
    cwd: root,
    encoding: "utf8",
  });

  return JSON.parse(output)
    .filter((project) => resolve(project.path) !== resolve(root))
    .map((project) => ({
      name: project.name,
      directory: relative(root, project.path).split(sep).join("/"),
      hasTests:
        JSON.parse(readFileSync(join(project.path, "package.json"), "utf8")).scripts?.test !==
        undefined,
    }));
}

export function ownerOf(file, projects) {
  let owner;

  for (const project of projects) {
    if (project.directory === "") continue;

    if (
      file.startsWith(`${project.directory}/`) &&
      (owner?.directory.length ?? -1) < project.directory.length
    ) {
      owner = project;
    }
  }

  return owner;
}

function missedOwners(files, projects, selectedNames) {
  const selected = new Set(selectedNames);
  const missed = new Set();

  for (const file of files.filter((candidate) => !isDocsOnly(candidate))) {
    const owner = ownerOf(file, projects);

    if (owner !== undefined && !selected.has(owner.name)) missed.add(owner.name);
  }

  return [...missed];
}

function testCommand(plan, packageNames) {
  if (plan.mode === "all") return ["pnpm", "exec", "vp", "run", "--recursive", "test"];

  if (plan.mode === "none" || packageNames.length === 0) return null;

  return [
    "pnpm",
    "exec",
    "vp",
    "run",
    ...packageNames.flatMap((name) => ["--filter", name]),
    "test",
  ];
}

function parseArguments(argv) {
  const options = { base: undefined, codeChanged: false, dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--base") {
      options.base = argv[index + 1];
      index += 1;
    } else if (argument === "--code-changed") options.codeChanged = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else throw new Error(`changed-packages: unknown argument ${argument}`);
  }

  return options;
}

function main(argv) {
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  const options = parseArguments(argv);
  const base = resolveBase(options.base, process.env);

  const plan = commitExists(root, base)
    ? planTests(changedFiles(root, base))
    : { mode: "all", reason: `base ${base} is not available (fetch it, or use fetch-depth: 0)` };

  if (options.codeChanged) {
    process.stdout.write(`code=${plan.mode !== "none"}\n`);

    return 0;
  }

  let packageNames = [];

  if (plan.mode === "changed") {
    const selected = listProjects(root, ["--filter", `...[${base}]`]);

    const missed = missedOwners(
      changedFiles(root, base),
      listProjects(root, []),
      selected.map((project) => project.name),
    );

    if (missed.length > 0) {
      process.stderr.write(
        `changed-packages: files changed in ${missed.join(", ")}, but pnpm's selector did not pick them. Refusing to report a green run that checked nothing.\n`,
      );

      return 1;
    }

    packageNames = selected.filter((project) => project.hasTests).map((project) => project.name);

    const untested = selected.filter((project) => !project.hasTests).map((project) => project.name);

    if (untested.length > 0) {
      process.stdout.write(
        `changed-packages: affected without a test script: ${untested.join(", ")}\n`,
      );
    }
  }

  const command = testCommand(plan, packageNames);

  process.stdout.write(`changed-packages: base ${base}, mode ${plan.mode} (${plan.reason})\n`);

  if (command === null) {
    process.stdout.write("changed-packages: no package with a test script is affected\n");

    return 0;
  }

  process.stdout.write(`changed-packages: ${command.join(" ")}\n`);

  if (options.dryRun) return 0;

  return spawnSync(command[0], command.slice(1), { cwd: root, stdio: "inherit" }).status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
