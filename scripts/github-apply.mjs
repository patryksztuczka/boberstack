import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const RULESETS_DIR = join(ROOT, ".github", "rulesets");

const REPOSITORY_SETTINGS = {
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  squash_merge_commit_title: "PR_TITLE",
  squash_merge_commit_message: "BLANK",
  delete_branch_on_merge: true,
  allow_auto_merge: true,
  allow_update_branch: true,
};

const gh = (args, input) =>
  execFileSync("gh", args, {
    cwd: ROOT,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "inherit"],
  });

const api = (method, path, body) =>
  JSON.parse(
    gh(
      ["api", "--method", method, path, ...(body === undefined ? [] : ["--input", "-"])],
      body === undefined ? undefined : JSON.stringify(body),
    ) || "null",
  );

const repository = () => {
  const index = process.argv.indexOf("--repo");

  if (index !== -1 && process.argv[index + 1] !== undefined) return process.argv[index + 1];

  return gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).trim();
};

const readRulesets = () =>
  readdirSync(RULESETS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(RULESETS_DIR, file), "utf8")));

const applyRuleset = (repo, existing, ruleset) => {
  const match = existing.find((candidate) => candidate.name === ruleset.name);

  if (match === undefined) {
    api("POST", `repos/${repo}/rulesets`, ruleset);

    return `created ruleset ${ruleset.name}`;
  }

  api("PUT", `repos/${repo}/rulesets/${match.id}`, ruleset);

  return `updated ruleset ${ruleset.name}`;
};

const main = () => {
  const repo = repository();

  api("PATCH", `repos/${repo}`, REPOSITORY_SETTINGS);
  console.log(`github-apply: ${repo}: squash-only merges, branches deleted on merge`);

  const existing = api("GET", `repos/${repo}/rulesets?includes_parents=false`);

  for (const ruleset of readRulesets()) {
    console.log(`github-apply: ${repo}: ${applyRuleset(repo, existing, ruleset)}`);
  }
};

try {
  main();
} catch (error) {
  console.error(`github-apply: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
