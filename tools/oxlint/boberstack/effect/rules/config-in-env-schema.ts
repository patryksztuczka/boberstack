import { readFileSync } from "node:fs";
import path from "node:path";

import { defineRule } from "vite-plus/lint/plugins";

import { staticString } from "../shared/ast.ts";
import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

const nameAfterFirstArgument: ReadonlySet<string> = new Set(["Literal", "Literals", "schema"]);

const namedConstructors: ReadonlySet<string> = new Set([
  "String",
  "NonEmptyString",
  "Number",
  "Finite",
  "Int",
  "Boolean",
  "Duration",
  "ByteSize",
  "Port",
  "LogLevel",
  "Redacted",
  "URL",
  "Date",
  ...nameAfterFirstArgument,
]);

const defaultSchema = ".env.schema";

const reference = ".agents/skills/effect-v4/references/07-configuration.md";

const item = /^(?<key>[A-Za-z_][A-Za-z0-9_]*)=/u;

const decorator = (comments: ReadonlyArray<string>, name: string): string | undefined => {
  const pattern = new RegExp(`@${name}(?:=(?<value>\\S+))?(?=\\s|$)`, "u");

  for (const comment of comments) {
    const match = pattern.exec(comment);

    if (match !== null) return match.groups?.["value"] ?? "true";
  }

  return undefined;
};

const sensitivity = (comments: ReadonlyArray<string>, fallback: boolean): boolean => {
  if (decorator(comments, "public") !== undefined) return false;
  const sensitive = decorator(comments, "sensitive");

  return sensitive === undefined ? fallback : sensitive !== "false";
};

const parseEnvSchema = (text: string): ReadonlyMap<string, boolean> => {
  const lines = text.split("\n").map((line) => line.trim());
  const divider = lines.indexOf("# ---");
  const header = divider === -1 ? [] : lines.slice(0, divider);
  const defaultSensitive = decorator(header, "defaultSensitive") !== "false";
  const keys = new Map<string, boolean>();
  let comments: string[] = [];

  for (const line of lines.slice(divider + 1)) {
    if (line.startsWith("#")) {
      comments.push(line);
      continue;
    }

    const key = item.exec(line)?.groups?.["key"];

    if (key !== undefined) keys.set(key, sensitivity(comments, defaultSensitive));
    comments = [];
  }

  return keys;
};

const schemas = new Map<string, ReadonlyMap<string, boolean>>();

const loadSchema = (file: string): ReadonlyMap<string, boolean> => {
  const cached = schemas.get(file);

  if (cached !== undefined) return cached;
  const parsed = parseEnvSchema(readFileSync(file, "utf8"));
  schemas.set(file, parsed);

  return parsed;
};

export const configInEnvSchemaRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every Config name to be a literal declared in .env.schema, read with Config.Redacted exactly when the schema marks it @sensitive.",
    },
    messages: {
      dynamicName: `Write the variable name as a string literal so the .env.schema check can see it (see ${reference}).`,
      missing: `\`{{key}}\` is not declared in {{schema}}. Add it there with its type and whether it is @sensitive (see ${reference}).`,
      readPlain: `{{schema}} marks \`{{key}}\` @sensitive: read it with \`Config.Redacted\` so it shows as <redacted> (see ${reference}).`,
      notSensitive: `\`{{key}}\` is read with \`Config.Redacted\` but {{schema}} does not mark it @sensitive. Mark it there so varlock masks it too (see ${reference}).`,
    },
    schema: [
      {
        type: "object",
        properties: { schema: { type: "string" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ schema: defaultSchema }],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const member = effectMember(context.sourceCode, node.callee);

        if (member?.module !== "Config" || !namedConstructors.has(member.member)) return;
        const argument = node.arguments[nameAfterFirstArgument.has(member.member) ? 1 : 0];

        if (argument === undefined) return;
        const key = staticString(argument);

        if (key === undefined) {
          context.report({ node: argument, messageId: "dynamicName" });

          return;
        }

        const { schema } = ruleOptions(context, { schema: defaultSchema });
        const sensitive = loadSchema(path.resolve(context.cwd, schema)).get(key);
        const data = { key, schema };

        if (sensitive === undefined) {
          context.report({ node: argument, messageId: "missing", data });
        } else if (sensitive && member.member !== "Redacted") {
          context.report({ node: argument, messageId: "readPlain", data });
        } else if (!sensitive && member.member === "Redacted") {
          context.report({ node: argument, messageId: "notSensitive", data });
        }
      },
    };
  },
});
