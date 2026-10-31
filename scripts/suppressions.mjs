import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASELINE_FILE = "suppressions.baseline.json";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

const SKIPPED_PREFIXES = ["tools/oxlint/anti-slop/", "apps/web/src/paraglide/"];

const DIRECTIVE =
  /(?:^|\s)(?:\/\/|\/\*+|\*)\s*(?<kind>(?:es|ox)lint-disable(?:-next-line|-line)?|@ts-expect-error|@ts-ignore|@ts-nocheck|@effect-diagnostics(?:-next-line)?)(?=\s|\*\/|$)(?<rest>.*)$/u;

const QUOTES = new Set(['"', "'", "`"]);

function insideString(line, index) {
  let open = null;

  for (let position = 0; position < index; position += 1) {
    const character = line[position];

    if (open === null) {
      if (QUOTES.has(character)) open = character;
    } else if (character === "\\") position += 1;
    else if (character === open) open = null;
  }

  return open !== null;
}

const rulesOf = (rest) =>
  rest
    .replace(/\*\/.*$/u, "")
    .split(/\s--(?:\s|$)/u)[0]
    .split(/[\s,]+/u)
    .filter((rule) => rule !== "");

function suppressionsIn(text) {
  const keys = [];

  for (const line of text.split("\n")) {
    const match = DIRECTIVE.exec(line);

    if (match === null || insideString(line, match.index)) continue;
    const kind = match.groups.kind;
    const rest = match.groups.rest;

    if (kind.startsWith("@ts-")) keys.push(kind);
    else if (kind.startsWith("@effect-diagnostics")) {
      for (const rule of rulesOf(rest)) keys.push(`@effect-diagnostics ${rule.split(":")[0]}`);
    } else {
      const rules = rulesOf(rest);

      if (rules.length === 0) keys.push("(every rule)");
      else keys.push(...rules);
    }
  }

  return keys;
}

function countSuppressions(files) {
  const counts = {};

  for (const { text } of files) {
    for (const key of suppressionsIn(text)) counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).toSorted(([left], [right]) => left.localeCompare(right)),
  );
}

function compareCounts(baseline, current) {
  const keys = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].toSorted(
    (left, right) => left.localeCompare(right),
  );

  const grown = [];
  const shrunk = [];

  for (const key of keys) {
    const before = baseline[key] ?? 0;
    const after = current[key] ?? 0;

    if (after > before) grown.push({ key, before, after });
    else if (after < before) shrunk.push({ key, before, after });
  }

  return { grown, shrunk };
}

const total = (counts) => Object.values(counts).reduce((sum, count) => sum + count, 0);

function report({ baseline, current, annotate }) {
  const { grown, shrunk } = compareCounts(baseline, current);
  const lines = [];

  if (grown.length > 0) {
    lines.push(
      `suppressions: WARNING, ${total(current)} in total, more than the baseline (${total(baseline)}):`,
    );

    for (const { key, before, after } of grown) {
      lines.push(`  + ${key}: ${before} -> ${after}`);

      if (annotate) {
        lines.push(`::warning title=Suppression added::${key}: ${before} -> ${after}`);
      }
    }

    lines.push(
      "  Each one needs a reason after ` -- ` on its line. If they are deliberate, run",
      "  `pnpm check:suppressions --update` and commit suppressions.baseline.json with the change.",
    );
  }

  if (shrunk.length > 0) {
    lines.push("suppressions: fewer than the baseline:");

    for (const { key, before, after } of shrunk) lines.push(`  - ${key}: ${before} -> ${after}`);

    lines.push(
      "  Run `pnpm check:suppressions --update` so the lower count becomes the new ceiling.",
    );
  }

  if (grown.length === 0 && shrunk.length === 0) {
    lines.push(`suppressions: ${total(current)} in total, same as the baseline.`);
  }

  return lines.join("\n");
}

function trackedSources(root) {
  return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter((file) => SOURCE_EXTENSIONS.has(extname(file)))
    .filter((file) => !SKIPPED_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .filter((file) => existsSync(join(root, file)))
    .map((file) => ({ file, text: readFileSync(join(root, file), "utf8") }));
}

function readBaseline(root) {
  const path = join(root, BASELINE_FILE);

  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function main(argv) {
  const rootFlag = argv.indexOf("--root");
  const root = resolve(rootFlag === -1 ? process.cwd() : argv[rootFlag + 1]);
  const current = countSuppressions(trackedSources(root));

  if (argv.includes("--update")) {
    writeFileSync(join(root, BASELINE_FILE), `${JSON.stringify(current, null, 2)}\n`);
    process.stdout.write(`suppressions: baseline updated, ${total(current)} in total.\n`);

    return;
  }

  const baseline = readBaseline(root);

  process.stdout.write(
    `${report({ baseline, current, annotate: process.env.GITHUB_ACTIONS === "true" })}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
