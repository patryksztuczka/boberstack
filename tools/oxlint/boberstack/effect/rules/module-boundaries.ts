import path from "node:path";

import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { type ImportSite, importSites, reaches } from "../shared/imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename, splitAtRoot, withoutExtension } from "../shared/paths.ts";

const aliases = { "@/": "<root>/" } satisfies Readonly<Record<string, string>>;

const indexOnly: ReadonlyArray<string> = ["apps/*/src/platform/**"];

const rootFiles: ReadonlyArray<string> = ["apps/*/src/*"];

const defaults = {
  sourceRoot: "apps/*/src/modules",
  aliases,
  indexOnly,
  rootFiles,
};

const rootBeside = (importer: string, sourceRoot: string): string => {
  const importerSegments = importer.split("/");

  return sourceRoot
    .split("/")
    .map((segment, index) => (segment === "*" ? (importerSegments[index] ?? segment) : segment))
    .join("/");
};

const segmentsBelowRoot = (
  relativePath: string,
  root: string,
  role: "importer" | "target",
): ReadonlyArray<string> | undefined => {
  if (!relativePath.startsWith(`${root}/`)) return undefined;
  const segments = withoutExtension(relativePath.slice(root.length + 1)).split("/");

  return role === "target" && segments.at(-1) === "index" ? segments.slice(0, -1) : segments;
};

const resolveSpecifier = (
  specifier: string,
  importer: string,
  root: string,
  aliases: Readonly<Record<string, string>>,
): string | undefined => {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  }

  for (const [alias, target] of Object.entries(aliases)) {
    if (specifier.startsWith(alias)) {
      return path.posix.normalize(target.replace("<root>", root) + specifier.slice(alias.length));
    }
  }

  return undefined;
};

const isTestCode = (relativePath: string): boolean =>
  /\.(test|spec)\.[cm]?tsx?$/.test(relativePath) || /\/(testing|tests)\//.test(relativePath);

export const moduleBoundariesRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Enforce module and bounded-context import boundaries." },
    messages: {
      module:
        "Import the `{{module}}` module through its index, not a file inside it (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      context:
        "Import the `{{context}}` bounded context through its index, not a file inside it (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      testing:
        "Only test code imports the `{{module}}` module's testing index (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      indexOnly:
        "Import the `{{context}}` context through a context or module index, not `{{file}}` (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      rootFile:
        "A module never imports `{{file}}`, a file of the composition root. Move what the module needs into it, or declare a port the root provides (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      rootFileDynamic:
        "This specifier is built at runtime, so the fence cannot tell whether it leads to a file of the composition root. Import a static path (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          sourceRoot: { type: "string" },
          aliases: { type: "object", additionalProperties: { type: "string" } },
          indexOnly: { type: "array", items: { type: "string" } },
          rootFiles: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ ...defaults, indexOnly: [...indexOnly], rootFiles: [...rootFiles] }],
  },
  createOnce(context) {
    const checkFromOutside = (
      sourceNode: ESTree.Node,
      specifier: string,
      importer: string,
      options: typeof defaults,
    ): void => {
      const root = rootBeside(importer, options.sourceRoot);
      const target = resolveSpecifier(specifier, importer, root, options.aliases);

      if (target === undefined || !target.startsWith(`${root}/`)) return;
      const segments = withoutExtension(target.slice(root.length + 1)).split("/");
      const [toContext, toModule] = segments;

      if (toContext === undefined) return;

      if (segments.at(-1) === "index" && segments.length <= 3) return;

      if (segments.length === 4 && segments[2] === "testing" && segments[3] === "index") {
        if (!isTestCode(importer)) {
          context.report({ node: sourceNode, messageId: "testing", data: { module: toModule } });
        }

        return;
      }

      context.report({
        node: sourceNode,
        messageId: "indexOnly",
        data: { context: toContext, file: segments.join("/") },
      });
    };

    const reportsRootFile = (
      { node, specifier, runtime }: ImportSite,
      importer: string,
      root: string,
      options: typeof defaults,
    ): boolean => {
      if (options.rootFiles.length === 0) return false;

      if (specifier === undefined) {
        if (runtime) context.report({ node, messageId: "rootFileDynamic" });

        return runtime;
      }

      const target = resolveSpecifier(specifier.text, importer, root, options.aliases);

      if (target === undefined || !reaches(target, specifier.partial, options.rootFiles)) {
        return false;
      }

      context.report(
        specifier.partial
          ? { node, messageId: "rootFileDynamic" }
          : { node, messageId: "rootFile", data: { file: target } },
      );

      return true;
    };

    const check = (site: ImportSite): void => {
      const { node: sourceNode, specifier: read } = site;
      const options = ruleOptions(context, defaults);
      const importer = relativeFilename(context);
      const split = splitAtRoot(importer, options.sourceRoot);

      if (split !== undefined && reportsRootFile(site, importer, split.root, options)) return;

      if (read === undefined || read.partial) return;
      const specifier = read.text;

      if (split === undefined) {
        if (matchesAny(importer, options.indexOnly)) {
          checkFromOutside(sourceNode, specifier, importer, options);
        }

        return;
      }

      const target = resolveSpecifier(specifier, importer, split.root, options.aliases);

      if (target === undefined) return;
      const from = segmentsBelowRoot(importer, split.root, "importer");
      const to = segmentsBelowRoot(target, split.root, "target");

      if (from === undefined || to === undefined || from.length === 0 || to.length === 0) return;

      const [fromContext] = from;
      const [toContext, toModule] = to;

      if (toContext === undefined) return;

      if (fromContext !== toContext) {
        if (to.length > 1) {
          context.report({ node: sourceNode, messageId: "context", data: { context: toContext } });
        }

        return;
      }

      const fromModule = from.length > 2 ? from[1] : undefined;

      if (toModule === undefined || to.length <= 2 || toModule === fromModule) return;

      if (to.length === 3 && to[2] === "testing") {
        if (!isTestCode(importer)) {
          context.report({ node: sourceNode, messageId: "testing", data: { module: toModule } });
        }

        return;
      }

      context.report({ node: sourceNode, messageId: "module", data: { module: toModule } });
    };

    return importSites(check);
  },
});
