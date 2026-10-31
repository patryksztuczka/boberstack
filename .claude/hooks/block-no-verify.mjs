import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BLOCK_MESSAGE =
  "Blocked: this git command bypasses the Git hooks (--no-verify, commit -n, HUSKY=0, VP_GIT_HOOKS=0, VITE_GIT_HOOKS=0 or core.hooksPath). Run it without the bypass and fix whatever the hook reports. See AGENTS.md, Stop rules.";

const SEPARATORS = new Set([";", "&&", "||", "|", "&", "\n", "(", ")"]);
const PREFIX_COMMANDS = new Set([
  "command",
  "exec",
  "time",
  "nice",
  "nohup",
  "sudo",
  "xargs",
  "env",
]);
const SHELLS = new Set(["sh", "bash", "zsh", "dash"]);
const HOOK_SKIP = /^(?:HUSKY|VP_GIT_HOOKS|VITE_GIT_HOOKS)=0$/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const GIT_OPTIONS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
]);
const COMMIT_OPTIONS_WITH_VALUE = new Set([
  "-m",
  "-F",
  "-C",
  "-c",
  "-t",
  "--message",
  "--file",
  "--author",
  "--date",
  "--template",
  "--reuse-message",
  "--reedit-message",
  "--fixup",
  "--squash",
  "--cleanup",
  "--trailer",
]);
const COMMIT_SHORT_WITH_VALUE = new Set(["m", "F", "C", "c", "t", "S", "u"]);
const NO_VERIFY = "--no-verify";
const SHORTEST_NO_VERIFY_PREFIX = "--no-ve".length;

export const tokenize = (command) => {
  const tokens = [];
  let current = "";
  let started = false;
  let quote = null;

  const push = () => {
    if (started) tokens.push(current);
    current = "";
    started = false;
  };

  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    const pair = command.slice(index, index + 2);

    if (quote !== null) {
      if (char === quote) quote = null;
      else if (char === "\\" && quote === '"' && index + 1 < command.length)
        current += command[++index];
      else current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (char === "\\" && index + 1 < command.length) {
      current += command[++index];
      started = true;
    } else if (pair === "&&" || pair === "||") {
      push();
      tokens.push(pair);
      index++;
    } else if (SEPARATORS.has(char)) {
      push();
      tokens.push(char);
    } else if (char === " " || char === "\t") {
      push();
    } else {
      current += char;
      started = true;
    }
  }

  push();
  return tokens;
};

const segmentsOf = (tokens) => {
  const segments = [[]];

  for (const token of tokens) {
    if (SEPARATORS.has(token) || token === "&&" || token === "||") segments.push([]);
    else segments[segments.length - 1].push(token);
  }

  return segments.filter((segment) => segment.length > 0);
};

const isNoVerify = (token) =>
  token.length >= SHORTEST_NO_VERIFY_PREFIX && NO_VERIFY.startsWith(token.split("=")[0]);

const commitSkipsHooks = (args) => {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--") return false;
    if (COMMIT_OPTIONS_WITH_VALUE.has(arg)) {
      index++;
      continue;
    }
    if (arg.startsWith("-") && !arg.startsWith("--")) {
      for (const flag of arg.slice(1)) {
        if (flag === "n") return true;
        if (COMMIT_SHORT_WITH_VALUE.has(flag)) break;
      }
    }
  }

  return false;
};

const gitBypasses = (args) => {
  let index = 0;

  while (index < args.length && args[index].startsWith("-")) {
    const option = args[index];
    const value =
      option === "-c" ? (args[index + 1] ?? "") : option.startsWith("-c") ? option.slice(2) : "";

    if (/^core\.hookspath/i.test(value)) return true;
    index += GIT_OPTIONS_WITH_VALUE.has(option) ? 2 : 1;
  }

  const subcommand = args[index];
  const rest = args.slice(index + 1);

  if (rest.some((arg) => arg.startsWith("--") && isNoVerify(arg))) return true;
  if (subcommand === "commit" && commitSkipsHooks(rest)) return true;
  if (subcommand === "config" && rest.some((arg) => /^core\.hookspath$/i.test(arg))) {
    return rest.some((arg) => arg === "--unset" || arg === "--unset-all") || rest.length > 1;
  }

  return false;
};

const segmentBypasses = (segment, depth) => {
  let index = 0;
  let skipsHooks = false;

  while (index < segment.length) {
    const token = segment[index];

    if (HOOK_SKIP.test(token)) skipsHooks = true;
    if (ASSIGNMENT.test(token) || PREFIX_COMMANDS.has(token)) index++;
    else break;
  }

  const program = segment[index];

  if (program === undefined) return false;
  if (SHELLS.has(basename(program)) && segment[index + 1] === "-c" && depth < 3) {
    return commandBypassesHooks(segment[index + 2] ?? "", depth + 1);
  }
  if (program === "eval" && depth < 3) {
    return commandBypassesHooks(segment.slice(index + 1).join(" "), depth + 1);
  }
  if (basename(program) !== "git") return false;

  return skipsHooks || gitBypasses(segment.slice(index + 1));
};

export const commandBypassesHooks = (command, depth = 0) => {
  const segments = segmentsOf(tokenize(command));
  const exportsSkip = segments.some(
    (segment) => segment[0] === "export" && segment.slice(1).some((token) => HOOK_SKIP.test(token)),
  );
  const runsGit = segments.some((segment) => segment.some((token) => basename(token) === "git"));

  if (exportsSkip && runsGit) return true;
  return segments.some((segment) => segmentBypasses(segment, depth));
};

const commandOf = (raw) => {
  const input = JSON.parse(raw);
  const command = input?.tool_input?.command;

  return String(command ?? "");
};

const main = () => {
  const raw = readFileSync(0, "utf8");
  let command = "";

  try {
    command = commandOf(raw);
  } catch {
    process.exit(0);
  }

  if (commandBypassesHooks(command)) {
    process.stderr.write(`${BLOCK_MESSAGE}\n`);
    process.exit(2);
  }
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
