import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = "boberstack";

const BUCKET = `${PROJECT}-pr-evidence`;

const WRANGLER = ["--silent", "dlx", "wrangler@4.156.0"];

const SETUP = "docs/operations/pr-evidence.md";

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

const CACHE_CONTROL = "public, max-age=31536000, immutable";

const DAY = 24 * 60 * 60;

const RETENTION_DAYS = 180;

const LIFECYCLE = {
  rules: [
    {
      id: "expire-pr-evidence",
      enabled: true,
      conditions: { prefix: "" },
      deleteObjectsTransition: { condition: { type: "Age", maxAge: RETENTION_DAYS * DAY } },
      abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: DAY } },
    },
  ],
};

class PrEvidenceError extends Error {}

function kindOf(file) {
  const extension = extname(file).toLowerCase();

  if (extension in IMAGE_TYPES) return "image";

  if (VIDEO_EXTENSIONS.includes(extension)) return "video";

  throw new PrEvidenceError(
    `${file} is neither an image (${Object.keys(IMAGE_TYPES).join(", ")}) nor a video (${VIDEO_EXTENSIONS.join(", ")}).`,
  );
}

function objectName(file) {
  const name = basename(file, extname(file))
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return name === "" ? "evidence" : name;
}

function publicBaseUrl(devUrlOutput) {
  const url = /https:\/\/pub-[0-9a-f]+\.r2\.dev/.exec(devUrlOutput)?.[0];

  if (url === undefined) {
    throw new PrEvidenceError(
      `${BUCKET} has no public r2.dev address. Run pnpm -s pr-evidence setup (${SETUP}).`,
    );
  }

  return url;
}

function markdownFor({ alt, url, posterUrl }) {
  return posterUrl === undefined ? `![${alt}](${url})` : `[![${alt}](${posterUrl})](${url})`;
}

function run(command, args, failure) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.error?.code === "ENOENT") throw new PrEvidenceError(`${command} is not installed.`);

  if (result.status !== 0) {
    throw new PrEvidenceError(`${failure}\n${(result.stderr || result.stdout).trim()}`);
  }

  return result.stdout;
}

function wrangler(args, failure) {
  return run(
    "pnpm",
    [...WRANGLER, ...args],
    `${failure} Sign in once with \`pnpm dlx wrangler@4.156.0 login\`, and set CLOUDFLARE_ACCOUNT_ID when the login sees more than one account. Setup: ${SETUP}.`,
  );
}

function ffmpeg(args) {
  try {
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], "ffmpeg failed.");
  } catch (error) {
    if (error.message === "ffmpeg is not installed.") {
      throw new PrEvidenceError("A recording needs ffmpeg: brew install ffmpeg.");
    }

    throw error;
  }
}

function upload(file, key, contentType, baseUrl) {
  wrangler(
    [
      "r2",
      "object",
      "put",
      `${BUCKET}/${key}`,
      "--file",
      file,
      "--content-type",
      contentType,
      "--cache-control",
      CACHE_CONTROL,
      "--remote",
    ],
    `Uploading ${file} failed.`,
  );

  return `${baseUrl}/${key}`;
}

function publish(file, baseUrl, workDirectory) {
  const prefix = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  const name = objectName(file);
  const alt = name.replaceAll("-", " ");

  if (kindOf(file) === "image") {
    const extension = extname(file).toLowerCase();
    const url = upload(file, `${prefix}/${name}${extension}`, IMAGE_TYPES[extension], baseUrl);

    return markdownFor({ alt, url });
  }

  const video = join(workDirectory, `${name}.mp4`);
  const poster = join(workDirectory, `${name}.png`);

  ffmpeg([
    "-i",
    file,
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    video,
  ]);
  ffmpeg(["-sseof", "-0.5", "-i", video, "-frames:v", "1", "-update", "1", poster]);

  const url = upload(video, `${prefix}/${name}.mp4`, "video/mp4", baseUrl);
  const posterUrl = upload(poster, `${prefix}/${name}.png`, "image/png", baseUrl);

  return markdownFor({ alt, url, posterUrl });
}

function readDevUrl() {
  try {
    return wrangler(
      ["r2", "bucket", "dev-url", "get", BUCKET],
      `Reading ${BUCKET}'s address failed.`,
    );
  } catch (error) {
    if (error.message.includes("The specified bucket does not exist")) {
      throw new PrEvidenceError(
        `${BUCKET} does not exist on this Cloudflare account. Its owner creates it once with pnpm -s pr-evidence setup (${SETUP}).`,
      );
    }

    throw error;
  }
}

function withWorkDirectory(work) {
  const workDirectory = mkdtempSync(join(tmpdir(), "pr-evidence-"));

  try {
    return work(workDirectory);
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

function setUp() {
  try {
    wrangler(["r2", "bucket", "create", BUCKET], `Creating ${BUCKET} failed.`);
  } catch (error) {
    if (!error.message.includes("already exists")) throw error;
  }

  wrangler(
    ["r2", "bucket", "dev-url", "enable", BUCKET, "--force"],
    `Opening ${BUCKET}'s r2.dev address failed.`,
  );

  withWorkDirectory((workDirectory) => {
    const lifecycle = join(workDirectory, "lifecycle.json");

    writeFileSync(lifecycle, JSON.stringify(LIFECYCLE));
    wrangler(
      ["r2", "bucket", "lifecycle", "set", BUCKET, "--file", lifecycle, "--force"],
      `Setting ${BUCKET}'s lifecycle failed.`,
    );
  });

  return [
    `${BUCKET} is public at ${publicBaseUrl(readDevUrl())}; objects expire ${RETENTION_DAYS} days after upload.`,
  ];
}

function publishEvidence(files) {
  if (files.length === 0) {
    throw new PrEvidenceError("Name at least one screenshot or recording to upload.");
  }

  for (const file of files) {
    if (!existsSync(file)) throw new PrEvidenceError(`${file} does not exist.`);

    kindOf(file);
  }

  const baseUrl = publicBaseUrl(readDevUrl());

  return withWorkDirectory((workDirectory) =>
    files.map((file) => publish(file, baseUrl, workDirectory)),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const lines = args[0] === "setup" ? setUp() : publishEvidence(args);

    process.stdout.write(`${lines.join("\n")}\n`);
  } catch (error) {
    if (!(error instanceof PrEvidenceError)) throw error;

    process.stderr.write(`pr-evidence: ${error.message}\n`);
    process.exitCode = 1;
  }
}
