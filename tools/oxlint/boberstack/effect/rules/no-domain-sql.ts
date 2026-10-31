import { defineRule } from "vite-plus/lint/plugins";

import type { Specifier } from "../shared/ast.ts";
import { type ImportSite, importSites, reaches, relativeTarget } from "../shared/imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const exceptions: Readonly<Record<string, string>> = {};

const defaults = {
  paths: ["apps/*/src/modules/**"],
  exceptions,
  packages: ["drizzle-orm", "pg", "@effect/sql-pg", "effect/sql", "@alchemy.run/sql"],
  database: ["apps/*/src/platform/database/**", "apps/*/src/testing/pg-test"],
  repositories: ["**/*.repository.ts"],
};

const isPackage = (specifier: Specifier, packages: ReadonlyArray<string>): boolean =>
  packages.some((name) =>
    specifier.partial
      ? specifier.text.startsWith(`${name}/`)
      : specifier.text === name || specifier.text.startsWith(`${name}/`),
  );

export const noDomainSqlRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow SQL, platform/database/ and *.repository.ts files in domain modules, tests included.",
    },
    messages: {
      package:
        "`{{source}}` talks to the database. A domain module asks a store port (`XStore` in `x.store.ts`) for what it needs, and a repository in apps/api/src/platform/database/ holds the SQL (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      database:
        "`{{source}}` is the database side of the app: the connection, a repository or the Postgres test layer. A domain module asks a store port (`XStore` in `x.store.ts`) for what it needs, and its contract runs on Postgres in apps/api/src/platform/database/x.repository.integration.test.ts (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
      dynamic:
        "This specifier is built at runtime, so the fence cannot tell where it leads: a substitution may climb out of any folder its static head names. Import a static path, or name the file in no-domain-sql's exceptions with its reason (see tools/oxlint/boberstack/effect/README.md).",
      repository:
        "A repository holds SQL and lives only in apps/api/src/platform/database/. Name the module's port `XStore` in `x.store.ts` and put its logic in `x.service.ts` (see .agents/skills/effect-best-practices/references/05-project-structure.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          paths: { type: "array", items: { type: "string" } },
          exceptions: { type: "object", additionalProperties: { type: "string", minLength: 1 } },
          packages: { type: "array", items: { type: "string" } },
          database: { type: "array", items: { type: "string" } },
          repositories: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [defaults],
  },
  createOnce(context) {
    const intoDatabase = (specifier: Specifier): boolean => {
      const target = relativeTarget(specifier, relativeFilename(context));

      return (
        target !== undefined &&
        reaches(target, specifier.partial, ruleOptions(context, defaults).database)
      );
    };

    const check = ({ node, specifier, runtime }: ImportSite): void => {
      if (specifier === undefined) {
        if (runtime) context.report({ node, messageId: "dynamic" });

        return;
      }

      const source = specifier.partial ? `${specifier.text}…` : specifier.text;

      if (isPackage(specifier, ruleOptions(context, defaults).packages)) {
        context.report({ node, messageId: "package", data: { source } });
      } else if (intoDatabase(specifier)) {
        context.report({ node, messageId: "database", data: { source } });
      } else if (specifier.partial) {
        context.report({ node, messageId: "dynamic" });
      }
    };

    return {
      before() {
        const options = ruleOptions(context, defaults);
        const relative = relativeFilename(context);

        const fenced =
          matchesAny(relative, options.paths) &&
          !matchesAny(relative, Object.keys(options.exceptions));

        return fenced ? undefined : false;
      },
      Program(node) {
        const relative = relativeFilename(context);

        if (matchesAny(relative, ruleOptions(context, defaults).repositories)) {
          context.report({ node, messageId: "repository" });
        }
      },
      ...importSites(check),
    };
  },
});
