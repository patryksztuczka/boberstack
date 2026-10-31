import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SCOPE = "@starter";

const DEFAULT_SERVICE_PREFIX = "starter";

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const SCOPE_PATTERN = /^@[a-z0-9][a-z0-9-]*$/;

const SERVICE_PREFIX_OPTION = /\bprefix:\s*["'](?<prefix>[a-z0-9][a-z0-9-]*)["']/;

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".toml",
  ".html",
  ".css",
  ".sql",
]);

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

const SKIPPED_FILES = new Set(["pnpm-lock.yaml", "scripts/init.mjs"]);

const USAGE =
  "Usage: node scripts/init.mjs [--name <name>] [--scope <@scope>] [--dry-run]\n" +
  "  --name   lower-case kebab-case project name, also the service-id prefix (e.g. acme-shop)\n" +
  "  --scope  package scope replacing @starter (e.g. @acme)\n";

const escapeRegExp = (text) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPosix = (path) => path.split(sep).join("/");

const pascalCase = (name) =>
  name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

function parseArguments(argv) {
  const options = { name: undefined, scope: undefined, dryRun: false, root: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--") continue;

    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--name" || argument === "--scope" || argument === "--root") {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else throw new Error(`unknown argument ${argument}\n${USAGE}`);
  }

  if (options.name === undefined && options.scope === undefined) {
    throw new Error(`pass --name, --scope or both\n${USAGE}`);
  }

  if (options.name !== undefined && !NAME_PATTERN.test(options.name)) {
    throw new Error(`--name must be lower-case kebab-case, got "${String(options.name)}"`);
  }

  if (options.scope !== undefined && !SCOPE_PATTERN.test(options.scope)) {
    throw new Error(`--scope must look like @acme, got "${String(options.scope)}"`);
  }

  return options;
}

function walk(root, directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;

    const path = join(directory, entry.name);

    if (entry.isDirectory()) walk(root, path, files);
    else if (entry.isFile()) files.push(toPosix(relative(root, path)));
  }

  return files;
}

function listFiles(root) {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );

    return output.split("\0").filter((path) => path !== "");
  } catch {
    return walk(root, root, []);
  }
}

function candidateFiles(root) {
  const files = [];

  for (const path of listFiles(root)) {
    if (SKIPPED_FILES.has(path) || !TEXT_EXTENSIONS.has(extname(path))) continue;

    if (path.split("/").some((part) => SKIPPED_DIRECTORIES.has(part))) continue;

    const absolute = join(root, path);

    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) continue;

    files.push(path);
  }

  return files;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function detectCurrent(root, files) {
  const scopes = new Map();

  for (const path of files) {
    if (!path.endsWith("package.json") || path === "package.json") continue;

    const name = readJson(join(root, path)).name ?? "";
    const match = /^(@[^/]+)\//.exec(name);

    if (match !== null) scopes.set(match[1], (scopes.get(match[1]) ?? 0) + 1);
  }

  const [scope] = [...scopes.entries()].toSorted((left, right) => right[1] - left[1])[0] ?? [
    DEFAULT_SCOPE,
  ];

  const config = ["tools/oxlint/lint.config.ts", "vite.config.ts"]
    .flatMap((path) =>
      existsSync(join(root, path)) ? [readFileSync(join(root, path), "utf8")] : [],
    )
    .join("\n");

  const ruleIndex = config.indexOf("service-id-matches-path");
  const prefixMatch = ruleIndex === -1 ? null : SERVICE_PREFIX_OPTION.exec(config.slice(ruleIndex));

  const pluginFolder = join(root, "tools", "oxlint", scope.slice(1));

  const plugins = existsSync(pluginFolder)
    ? readdirSync(pluginFolder, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? [entry.name] : [],
      )
    : [];

  return {
    name: readJson(join(root, "package.json")).name,
    scope,
    servicePrefix: prefixMatch?.groups.prefix ?? DEFAULT_SERVICE_PREFIX,
    plugins,
  };
}

const pluginFolderAhead = (current) =>
  `/(?:(?:${current.plugins.map(escapeRegExp).join("|")})\\b|\\s)`;

const pluginFolderGuard = (current) =>
  current.plugins.length === 0 ? "" : `(?!${pluginFolderAhead(current)})`;

function buildReplacements(current, options) {
  const replacements = [];

  if (options.name !== undefined && options.name !== current.name) {
    replacements.push({
      label: "project name",
      pattern: new RegExp(
        `(?<![\\w@.-])${escapeRegExp(current.name)}(?![\\w-])${pluginFolderGuard(current)}`,
        "g",
      ),
      replacement: options.name,
    });
    replacements.push({
      label: "PascalCase project name",
      pattern: new RegExp(`\\b${escapeRegExp(pascalCase(current.name))}\\b`, "g"),
      replacement: pascalCase(options.name),
    });
  }

  if (options.name !== undefined && options.name !== current.servicePrefix) {
    replacements.push({
      label: "service-id prefix",
      pattern: new RegExp(`(["'\`])${escapeRegExp(current.servicePrefix)}(?=["'\`/])`, "g"),
      replacement: `$1${options.name}`,
    });
  }

  if (options.scope !== undefined && options.scope !== current.scope) {
    replacements.push({
      label: "package scope",
      pattern: new RegExp(`(?<![\\w@])${escapeRegExp(current.scope)}/`, "g"),
      replacement: `${options.scope}/`,
    });

    if (current.plugins.length > 0) {
      replacements.push({
        label: "lint plugin folder",
        pattern: new RegExp(
          `(?<![\\w@.-])${escapeRegExp(current.scope.slice(1))}(?=${pluginFolderAhead(current)})`,
          "g",
        ),
        replacement: options.scope.slice(1),
      });
    }
  }

  return replacements;
}

function rewrite(text, replacements) {
  let result = text;
  const counts = new Map();

  for (const { label, pattern, replacement } of replacements) {
    const matches = result.match(pattern)?.length ?? 0;

    if (matches === 0) continue;

    counts.set(label, matches);
    result = result.replace(pattern, replacement);
  }

  return { text: result, counts };
}

function planInit(root, options) {
  const files = candidateFiles(root);
  const current = detectCurrent(root, files);
  const replacements = buildReplacements(current, options);
  const changes = [];

  if (replacements.length === 0) return { current, changes };

  for (const path of files) {
    const before = readFileSync(join(root, path), "utf8");
    const { text, counts } = rewrite(before, replacements);

    if (text !== before) changes.push({ path, text, counts });
  }

  return { current, changes };
}

function pluginFolderMove(root, current, options) {
  if (
    options.scope === undefined ||
    options.scope === current.scope ||
    current.plugins.length === 0
  ) {
    return undefined;
  }

  const from = `tools/oxlint/${current.scope.slice(1)}`;
  const to = `tools/oxlint/${options.scope.slice(1)}`;

  return existsSync(join(root, from)) ? { from, to } : undefined;
}

const movedPath = (path, folder) =>
  folder !== undefined && path.startsWith(`${folder.from}/`)
    ? `${folder.to}${path.slice(folder.from.length)}`
    : path;

function describe(counts) {
  return [...counts.entries()].map(([label, count]) => `${count} ${label}`).join(", ");
}

function main(argv) {
  const options = parseArguments(argv);
  const root = resolve(options.root ?? join(import.meta.dirname, ".."));
  const { current, changes } = planInit(root, options);
  const verb = options.dryRun ? "would update" : "updated";

  process.stdout.write(
    `init: current name ${current.name}, scope ${current.scope}, service-id prefix ${current.servicePrefix}\n`,
  );

  if (changes.length === 0) {
    process.stdout.write("init: nothing to change\n");

    return;
  }

  for (const change of changes) {
    if (!options.dryRun) writeFileSync(join(root, change.path), change.text);

    process.stdout.write(`init: ${verb} ${change.path} (${describe(change.counts)})\n`);
  }

  const folder = pluginFolderMove(root, current, options);

  if (folder !== undefined) {
    if (!options.dryRun) renameSync(join(root, folder.from), join(root, folder.to));

    process.stdout.write(
      `init: ${options.dryRun ? "would move" : "moved"} ${folder.from} to ${folder.to}\n`,
    );
  }

  if (options.dryRun) {
    process.stdout.write(`init: dry run, ${changes.length} file(s) left untouched\n`);

    return;
  }

  const vp = join(root, "node_modules", ".bin", "vp");

  const formatted = existsSync(vp)
    ? spawnSync(vp, ["fmt", ...changes.map((change) => movedPath(change.path, folder))], {
        cwd: root,
        encoding: "utf8",
      })
    : { status: 1 };

  if (formatted.status !== 0) {
    process.stderr.write(
      "init: could not format the renamed files. Run pnpm install, then pnpm exec vp fmt, before pnpm verify.\n",
    );
  }

  process.stdout.write(
    `init: ${changes.length} file(s) updated and formatted. Run pnpm install to refresh pnpm-lock.yaml, then pnpm verify.\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`init: ${error.message}\n`);
    process.exitCode = 1;
  }
}
