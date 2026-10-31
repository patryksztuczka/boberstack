import path from "node:path";

import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { isRequire, keyName, type Specifier, specifierOf, staticString } from "../shared/ast.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, mayReach, relativeFilename } from "../shared/paths.ts";
import { isAmbientGlobal } from "../shared/scope.ts";

const defaults = {
  paths: ["apps/*/src/modules/**"],
  allow: ["**/*.test.ts", "**/tests/**", "**/testing/**"],
  vendors: ["better-auth", "@alchemy.run/*", "alchemy", "pg", "@effect/sql-pg", "undici"],
  network: ["http", "https", "http2", "net", "tls", "dns", "dgram"],
  platform: ["apps/*/src/platform/**"],
  platformAliases: ["#platform/", "@/platform/"],
};

const networkGlobals: ReadonlySet<string> = new Set([
  "fetch",
  "WebSocket",
  "XMLHttpRequest",
  "EventSource",
]);

const globalHosts: ReadonlySet<string> = new Set(["globalThis", "self", "window"]);

const isVendor = (source: string, vendors: ReadonlyArray<string>): boolean =>
  vendors.some((vendor) =>
    vendor.endsWith("/*")
      ? source.startsWith(vendor.slice(0, -1))
      : source === vendor || source.startsWith(`${vendor}/`),
  );

const isNetwork = (source: string, network: ReadonlyArray<string>): boolean => {
  const name = source.replace(/^node:/, "");

  return network.some((module) => name === module || name.startsWith(`${module}/`));
};

const valueWrappers: ReadonlySet<string> = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
]);

type AnyIdentifier =
  | ESTree.IdentifierName
  | ESTree.IdentifierReference
  | ESTree.BindingIdentifier
  | ESTree.LabelIdentifier
  | ESTree.TSIndexSignatureName;

const isValueReference = (node: AnyIdentifier): node is ESTree.IdentifierReference => {
  const parent = node.parent;

  if (parent === null || parent === undefined) return true;

  if (parent.type === "MemberExpression") return parent.object === node || parent.computed;

  if (parent.type === "Property") return parent.value === node || parent.computed;

  if (
    parent.type === "MethodDefinition" ||
    parent.type === "PropertyDefinition" ||
    parent.type === "AccessorProperty"
  ) {
    return parent.key !== node || parent.computed;
  }

  return !parent.type.startsWith("TS") || valueWrappers.has(parent.type);
};

export const noDomainAdaptersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow vendor SDKs, network modules and globals, and platform/ adapters in domain modules.",
    },
    messages: {
      vendor:
        "`{{source}}` is an adapter's SDK. A domain module cannot import HTTP clients or adapters: declare a port in the module, implement it in platform/, and provide it from the composition root (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      network:
        "`{{source}}` reaches the network without a port. Declare a port in the module, implement it in platform/, and provide it from the composition root (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      platform:
        "`{{source}}` is an adapter in platform/. A domain module depends on its own port, never on an adapter; the composition root chooses the adapter (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      global:
        "`{{name}}` reaches the network without a port. Declare a port in the module, implement it in platform/, and provide it from the composition root (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          paths: { type: "array", items: { type: "string" } },
          allow: { type: "array", items: { type: "string" } },
          vendors: { type: "array", items: { type: "string" } },
          network: { type: "array", items: { type: "string" } },
          platform: { type: "array", items: { type: "string" } },
          platformAliases: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [defaults],
  },
  createOnce(context) {
    const applies = (): boolean => {
      const options = ruleOptions(context, defaults);
      const relative = relativeFilename(context);

      return matchesAny(relative, options.paths) && !matchesAny(relative, options.allow);
    };

    const intoPlatform = ({ text, partial }: Specifier): boolean => {
      const options = ruleOptions(context, defaults);

      if (options.platformAliases.some((alias) => text.startsWith(alias))) return true;

      if (!text.startsWith("./") && !text.startsWith("../")) return false;
      const importer = relativeFilename(context);
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(importer), text));

      if (partial) return mayReach(target, options.platform);

      return matchesAny(target, options.platform) || matchesAny(`${target}/`, options.platform);
    };

    const check = (
      node: ESTree.Node,
      specifier: Specifier | undefined,
      typesOnly: boolean,
    ): void => {
      if (specifier === undefined || !applies()) return;
      const options = ruleOptions(context, defaults);
      const source = specifier.partial ? `${specifier.text}…` : specifier.text;

      if (!typesOnly && isVendor(specifier.text, options.vendors)) {
        context.report({ node, messageId: "vendor", data: { source } });
      } else if (!typesOnly && !specifier.partial && isNetwork(specifier.text, options.network)) {
        context.report({ node, messageId: "network", data: { source } });
      } else if (intoPlatform(specifier)) {
        context.report({ node, messageId: "platform", data: { source } });
      }
    };

    const isAmbientHost = (node: ESTree.Expression): boolean =>
      node.type === "Identifier" &&
      globalHosts.has(node.name) &&
      isAmbientGlobal(context.sourceCode, node);

    return {
      ImportDeclaration(node) {
        const typesOnly =
          node.importKind === "type" ||
          (node.specifiers.length > 0 &&
            node.specifiers.every(
              (specifier) =>
                specifier.type === "ImportSpecifier" && specifier.importKind === "type",
            ));

        check(node, specifierOf(node.source), typesOnly);
      },
      ImportExpression(node) {
        check(node, specifierOf(node.source), false);
      },
      ExportNamedDeclaration(node) {
        if (node.source === null) return;

        const typesOnly =
          node.exportKind === "type" ||
          (node.specifiers.length > 0 &&
            node.specifiers.every((specifier) => specifier.exportKind === "type"));

        check(node, specifierOf(node.source), typesOnly);
      },
      ExportAllDeclaration(node) {
        check(node, specifierOf(node.source), node.exportKind === "type");
      },
      CallExpression(node) {
        if (!isRequire(node.callee)) return;
        check(node, specifierOf(node.arguments[0]), false);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type !== "TSExternalModuleReference") return;
        check(node, specifierOf(node.moduleReference.expression), node.importKind === "type");
      },
      Identifier(node) {
        if (!networkGlobals.has(node.name) || !isValueReference(node)) return;

        if (!applies() || !isAmbientGlobal(context.sourceCode, node)) return;
        context.report({ node, messageId: "global", data: { name: node.name } });
      },
      MemberExpression(node) {
        const name = node.computed
          ? staticString(node.property)
          : node.property.type === "Identifier"
            ? node.property.name
            : undefined;

        if (name === undefined || !networkGlobals.has(name)) return;

        if (!applies() || !isAmbientHost(node.object)) return;
        const host = node.object.type === "Identifier" ? node.object.name : "globalThis";
        context.report({ node, messageId: "global", data: { name: `${host}.${name}` } });
      },
      VariableDeclarator(node) {
        if (node.id.type !== "ObjectPattern" || node.init === null) return;

        if (!applies() || !isAmbientHost(node.init)) return;

        for (const property of node.id.properties) {
          if (property.type !== "Property" || property.computed) continue;
          const name = keyName(property.key);

          if (name !== undefined && networkGlobals.has(name)) {
            context.report({ node: property, messageId: "global", data: { name } });
          }
        }
      },
    };
  },
});
