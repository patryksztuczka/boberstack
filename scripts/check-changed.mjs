import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { affectsEverything, isDocsOnly, ownerOf } from "./changed-packages.mjs";

const TYPED = /\.(?:ts|tsx|mts|cts)$/;

const TYPECHECK_INPUTS = /(?:^|\/)(?:tsconfig[\w.-]*\.json|package\.json)$/;

const CHECKABLE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|jsonc|md|css|ya?ml|html)$/;

const OUTPUT_LIMIT = 6000;

const BASE_CANDIDATES = ["origin/HEAD", "origin/master", "master"];

function planChecks(changedFiles, projects) {
  const code = changedFiles.filter((file) => !isDocsOnly(file));
  const everything = code.some(affectsEverything);
  const owners = new Set();

  for (const file of code) {
    const owner = ownerOf(file, projects);

    if (owner !== undefined) owners.add(owner.name);
  }

  return {
    files: changedFiles.filter((file) => CHECKABLE.test(file)),
    typecheck: everything || code.some((file) => TYPED.test(file) || TYPECHECK_INPUTS.test(file)),
    tests: everything ? "all" : [...owners].toSorted((left, right) => left.localeCompare(right)),
  };
}

function commands(plan) {
  const steps = [];

  if (plan.files.length > 0) {
    steps.push({
      name: "vp check (changed files)",
      command: ["pnpm", "exec", "vp", "check", "--no-error-on-unmatched-pattern", ...plan.files],
    });
  }

  if (plan.typecheck) steps.push({ name: "typecheck", command: ["pnpm", "run", "typecheck"] });

  if (plan.tests === "all") {
    steps.push({ name: "unit tests (all)", command: ["pnpm", "exec", "vp", "run", "-r", "test"] });
  } else if (plan.tests.length > 0) {
    steps.push({
      name: `unit tests (${plan.tests.join(", ")} and dependents)`,
      command: [
        "pnpm",
        ...plan.tests.flatMap((name) => ["--filter", `...${name}`]),
        "--if-present",
        "run",
        "test",
      ],
    });
  }

  return steps;
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function lines(text) {
  return text.split("\n").filter((line) => line !== "");
}

function resolveBase(root) {
  for (const candidate of BASE_CANDIDATES) {
    try {
      return git(root, ["merge-base", "HEAD", candidate]).trim();
    } catch {
      continue;
    }
  }

  try {
    return git(root, ["rev-parse", "--verify", "HEAD"]).trim();
  } catch {
    return undefined;
  }
}

function changedFiles(root, base) {
  const untracked = lines(git(root, ["ls-files", "--others", "--exclude-standard"]));

  const tracked =
    base === undefined
      ? lines(git(root, ["ls-files", "--cached"]))
      : lines(git(root, ["diff", "--name-only", base]));

  return [...new Set([...tracked, ...untracked])].filter((file) => existsSync(join(root, file)));
}

function workspaceProjects(root) {
  const output = execFileSync("pnpm", ["ls", "--recursive", "--depth", "-1", "--json"], {
    cwd: root,
    encoding: "utf8",
  });

  return JSON.parse(output).map((project) => {
    return {
      name: project.name,
      directory: relative(root, project.path).split("\\").join("/"),
    };
  });
}

function run(root, step, quiet) {
  if (!quiet) process.stdout.write(`check:changed: ${step.name}\n`);

  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: root,
    encoding: "utf8",
    stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  if (result.status === 0) return true;

  if (quiet) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    process.stderr.write(`check:changed: ${step.name} failed\n${output.slice(-OUTPUT_LIMIT)}\n`);
  }

  return false;
}

function main(argv) {
  const quiet = argv.includes("--quiet");
  const dryRun = argv.includes("--dry-run");
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  const base = resolveBase(root);
  const files = changedFiles(root, base);

  if (files.length === 0) {
    if (!quiet) process.stdout.write("check:changed: nothing changed\n");

    return 0;
  }

  const steps = commands(planChecks(files, workspaceProjects(root)));

  if (dryRun) {
    for (const step of steps) process.stdout.write(`${step.name}: ${step.command.join(" ")}\n`);

    return 0;
  }

  for (const step of steps) {
    if (!run(root, step, quiet)) return 1;
  }

  if (!quiet) process.stdout.write(`check:changed: ${files.length} changed file(s) are green\n`);

  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
