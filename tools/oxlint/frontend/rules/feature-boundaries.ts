import path from "node:path";

import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { type ImportSite, importSites } from "../../effect/shared/imports.ts";
import { ruleOptions } from "../../effect/shared/options.ts";
import {
  matchesAny,
  relativeFilename,
  splitAtRoot,
  withoutExtension,
} from "../../effect/shared/paths.ts";

type Options = {
  readonly featuresRoot: string;
  readonly layers: ReadonlyArray<string>;
  readonly roots: ReadonlyArray<string>;
};

const defaults: Options = {
  featuresRoot: "apps/web/src/features",
  layers: ["apps/web/src/shared", "apps/web/src/features", "apps/web/src/app"],
  roots: ["apps/web/src/runtime.ts"],
};

const readme = "tools/oxlint/frontend/README.md";

const layerIndex = (file: string, layers: ReadonlyArray<string>): number =>
  layers.findIndex((layer) => splitAtRoot(file, layer) !== undefined);

const layerName = (layer: string | undefined): string => layer?.split("/").at(-1) ?? "";

const featureOf = (file: string, root: string): ReadonlyArray<string> | undefined => {
  const split = splitAtRoot(file, root);

  return split === undefined ? undefined : withoutExtension(split.rest).split("/");
};

const isFeatureIndex = (segments: ReadonlyArray<string>): boolean =>
  segments.length === 1 || (segments.length === 2 && segments[1] === "index");

export const featureBoundariesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Keep frontend imports pointing one way (shared → features → app) and reach another feature only through its index.",
    },
    messages: {
      upward: `\`{{from}}\` sits below \`{{to}}\` in the import direction {{order}}, so it cannot import \`{{file}}\`. Move what both need down into \`{{from}}\`, or pass it in from \`{{to}}\` as a prop or argument (see ${readme}).`,
      feature: `Import the \`{{feature}}\` feature through \`features/{{feature}}/index.ts\`, not \`{{file}}\`. A feature's files are private, so it can change or go away without breaking the others; export what you need from its index (see ${readme}).`,
    },
    schema: [
      {
        type: "object",
        properties: {
          featuresRoot: { type: "string" },
          layers: { type: "array", items: { type: "string" } },
          roots: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ ...defaults, layers: [...defaults.layers], roots: [...defaults.roots] }],
  },
  createOnce(context) {
    const report = (
      node: ESTree.Node,
      messageId: "upward" | "feature",
      data: Record<string, string>,
    ) => context.report({ node, messageId, data });

    const check = ({ node, specifier }: ImportSite): void => {
      if (specifier === undefined || specifier.partial) return;

      if (!specifier.text.startsWith("./") && !specifier.text.startsWith("../")) return;
      const options = ruleOptions(context, defaults);
      const importer = relativeFilename(context);

      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(importer), specifier.text),
      );

      const fromLayer = layerIndex(importer, options.layers);
      const toLayer = layerIndex(target, options.layers);

      if (fromLayer !== -1 && toLayer > fromLayer) {
        report(node, "upward", {
          from: layerName(options.layers[fromLayer]),
          to: layerName(options.layers[toLayer]),
          order: options.layers.map(layerName).join(" → "),
          file: withoutExtension(target),
        });

        return;
      }

      if (matchesAny(importer, options.roots)) return;
      const to = featureOf(target, options.featuresRoot);

      if (to === undefined || isFeatureIndex(to)) return;
      const [feature = ""] = to;
      const from = featureOf(importer, options.featuresRoot);

      if (from?.[0] === feature) return;
      report(node, "feature", { feature, file: to.join("/") });
    };

    return importSites(check);
  },
});
