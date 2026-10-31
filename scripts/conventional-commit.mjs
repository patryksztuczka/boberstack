import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONVENTIONAL_TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "docs",
  "test",
  "build",
  "ci",
  "chore",
];

const CONVENTIONAL_SUBJECT =
  /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9-]*)\))?(?<breaking>!)?: (?<description>\S.*)$/;

const SCISSORS = /^# -+ >8 -+$/;

const LEFT_FOR_LATER = /^(?:fixup|squash|amend)! |^Merge /;

const FORMAT_HINT =
  "Write <type>(<optional-scope>): <what changes and why>, for example " +
  '"fix(api): return 404 when a todo does not exist". ' +
  `The type is one of ${CONVENTIONAL_TYPES.join(", ")}; the scope is lower-case words joined by hyphens.`;

function parseConventionalSubject(subject) {
  const match = CONVENTIONAL_SUBJECT.exec(subject ?? "");

  if (match === null || !CONVENTIONAL_TYPES.includes(match.groups.type)) return null;

  return {
    type: match.groups.type,
    scope: match.groups.scope ?? null,
    breaking: match.groups.breaking === "!",
    description: match.groups.description.trimEnd(),
  };
}

function subjectOf(message) {
  for (const line of (message ?? "").split("\n")) {
    if (SCISSORS.test(line)) break;

    if (line.startsWith("#")) continue;

    if (line.trim() !== "") return line.trim();
  }

  return "";
}

function messageProblem(message) {
  const subject = subjectOf(message);

  if (subject === "") return null;

  if (LEFT_FOR_LATER.test(subject)) return null;

  if (parseConventionalSubject(subject) !== null) return null;

  return (
    `"${subject}" is not a Conventional Commit subject. A rebase merge, or a squash merge of a ` +
    "single commit, puts this subject on main, and the changelog groups changes by its type. " +
    FORMAT_HINT
  );
}

function titleProblem(title) {
  const subject = (title ?? "").trim();

  if (parseConventionalSubject(subject) !== null) return null;

  return (
    `"${subject}" is not a Conventional Commit title. A squash merge uses the pull request title ` +
    "as the commit subject on main, and the changelog groups changes by its type. " +
    FORMAT_HINT
  );
}

function runCli(argv) {
  if (argv[0] === "--title") {
    if (argv.length < 2) return { problem: "pr-title: pass the title after --title" };

    const problem = titleProblem(argv[1]);

    return { problem: problem === null ? null : `pr-title: ${problem}` };
  }

  if (argv.length === 0) {
    return { problem: "commit-msg: pass the commit message file, or --title <title>" };
  }

  const problem = messageProblem(readFileSync(argv[0], "utf8"));

  return { problem: problem === null ? null : `commit-msg: ${problem}` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { problem } = runCli(process.argv.slice(2));

  if (problem !== null) {
    process.stderr.write(`${problem}\n`);
    process.exitCode = 1;
  }
}
