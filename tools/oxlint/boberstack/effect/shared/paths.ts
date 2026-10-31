import path from "node:path";

import type { Context } from "vite-plus/lint/plugins";

export const relativeFilename = (context: Context): string =>
  path.relative(context.cwd, context.filename).split(path.sep).join("/");

const escapeRegExp = (text: string): string => text.replace(/[.+^$()|[\]\\]/g, "\\$&");

export const globSource = (glob: string): string => {
  let source = "";

  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];

    if (char === "*" && glob[index + 1] === "*") {
      const slash = glob[index + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      index += slash ? 2 : 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else if (char === "{") {
      const end = glob.indexOf("}", index);

      const options = glob
        .slice(index + 1, end)
        .split(",")
        .map(escapeRegExp);

      source += `(?:${options.join("|")})`;
      index = end;
    } else if (char !== undefined) {
      source += escapeRegExp(char);
    }
  }

  return source;
};

export const matchesAny = (relative: string, globs: ReadonlyArray<string>): boolean =>
  globs.some((glob) => new RegExp(`^${globSource(glob)}$`).test(relative));

const matchesSegment = (segment: string, glob: string): boolean =>
  new RegExp(`^${globSource(glob)}$`).test(segment);

export const mayReach = (prefix: string, globs: ReadonlyArray<string>): boolean => {
  const segments = prefix.split("/");
  const last = segments.pop() ?? "";

  return globs.some((glob) => {
    const parts = glob.split("/");

    for (const [index, segment] of segments.entries()) {
      const part = parts[index];

      if (part === undefined) return false;

      if (part === "**") return true;

      if (!matchesSegment(segment, part)) return false;
    }

    const next = parts[segments.length];

    if (next === undefined) return false;

    return /[*?{]/.test(next) || next.startsWith(last);
  });
};

export const splitAtRoot = (
  relative: string,
  rootGlob: string,
): { readonly root: string; readonly rest: string } | undefined => {
  const match = new RegExp(`^(${globSource(rootGlob)})/(.+)$`).exec(relative);

  if (match === null || match[1] === undefined || match[2] === undefined) return undefined;

  return { root: match[1], rest: match[2] };
};

export const withoutExtension = (file: string): string =>
  file.replace(/\.(?:d\.)?[cm]?[jt]sx?$/, "");
