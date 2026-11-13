import { Option, Predicate, Schema } from "effect";
import type { JsonSchema } from "effect";
import { Tool } from "effect/ai";

import type { Annotations, InputSchema } from "../contract.ts";
import type { AnyCapability } from "../implement.ts";

export interface CatalogEntry {
  readonly name: string;
  readonly description: string;
  readonly annotations: Annotations;
  readonly input: JsonSchema.JsonSchema;
  readonly output: JsonSchema.JsonSchema;
  readonly failure: JsonSchema.JsonSchema;
}

export interface Catalog {
  readonly version: "1";
  readonly capabilities: readonly CatalogEntry[];
}

const inputJsonSchemaOf = (input: InputSchema): JsonSchema.JsonSchema => {
  const schema = Tool.getJsonSchemaFromSchema(input);

  if (Object.keys(input.fields).length !== 0) {
    return schema;
  }

  const { not: nullGuard, ...withoutGuard } = schema;

  const base =
    Predicate.isObject(nullGuard) &&
    Object.keys(nullGuard).length === 1 &&
    Predicate.hasProperty(nullGuard, "type") &&
    nullGuard.type === "null"
      ? withoutGuard
      : schema;

  return { ...base, properties: {}, type: "object" };
};

export const toCatalog = (capabilities: readonly AnyCapability[]): Catalog => ({
  capabilities: capabilities.map(({ contract }) => ({
    annotations: contract.annotations,
    description: contract.description,
    failure: Tool.getJsonSchemaFromSchema(contract.failure),
    input: inputJsonSchemaOf(contract.input),
    name: contract.name,
    output: Tool.getJsonSchemaFromSchema(contract.output),
  })),
  version: "1",
});

type JsonLiteral = string | number | boolean | null;

export interface JsonSchemaNode {
  readonly $defs?: Readonly<Record<string, JsonSchemaNode>>;
  readonly $ref?: string;
  readonly anyOf?: readonly JsonSchemaNode[];
  readonly const?: JsonLiteral;
  readonly description?: string;
  readonly enum?: readonly JsonLiteral[];
  readonly items?: JsonSchemaNode;
  readonly not?: JsonSchemaNode;
  readonly oneOf?: readonly JsonSchemaNode[];
  readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
  readonly required?: readonly string[];
  readonly type?: string | readonly string[];
}

const JsonLiteralSchema = Schema.Union([Schema.String, Schema.Finite, Schema.Boolean, Schema.Null]);

const JsonSchemaNodeSchema: Schema.Codec<JsonSchemaNode> = Schema.Struct({
  $defs: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.suspend(() => JsonSchemaNodeSchema),
    ),
  ),
  $ref: Schema.optionalKey(Schema.String),
  anyOf: Schema.optionalKey(Schema.Array(Schema.suspend(() => JsonSchemaNodeSchema))),
  const: Schema.optionalKey(JsonLiteralSchema),
  description: Schema.optionalKey(Schema.String),
  enum: Schema.optionalKey(Schema.Array(JsonLiteralSchema)),
  items: Schema.optionalKey(Schema.suspend(() => JsonSchemaNodeSchema)),
  not: Schema.optionalKey(Schema.suspend(() => JsonSchemaNodeSchema)),
  oneOf: Schema.optionalKey(Schema.Array(Schema.suspend(() => JsonSchemaNodeSchema))),
  properties: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.suspend(() => JsonSchemaNodeSchema),
    ),
  ),
  required: Schema.optionalKey(Schema.Array(Schema.String)),
  type: Schema.optionalKey(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
});

export const parseNode = Schema.decodeUnknownOption(JsonSchemaNodeSchema);

const quoteKey = (key: string): string =>
  /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);

const literal = (value: JsonLiteral): string => (value === null ? "null" : JSON.stringify(value));

const DEFS_PREFIX = "#/$defs/";

const refName = (ref: string | undefined): string | undefined =>
  ref?.startsWith(DEFS_PREFIX) === true ? ref.slice(DEFS_PREFIX.length) : undefined;

const union = (members: readonly string[]): string => [...new Set(members)].join(" | ");

const printNode = (node: JsonSchemaNode): string => {
  const ref = refName(node.$ref);

  if (ref !== undefined) {
    return ref;
  }

  if (node.const !== undefined) {
    return literal(node.const);
  }

  if (node.not !== undefined && Object.keys(node.not).length === 0) {
    return "never";
  }

  const variants = node.anyOf ?? node.oneOf;

  if (variants !== undefined) {
    return union(variants.map(printNode));
  }

  const types = [node.type ?? []].flat();

  if (types.length > 0) {
    return union(types.map((member) => primitive(member, node)));
  }

  if (node.enum !== undefined) {
    return node.enum.map(literal).join(" | ");
  }

  return "unknown";
};

const objectType = (node: JsonSchemaNode): string => {
  const required = new Set(node.required);

  const members = Object.entries(node.properties ?? {}).map(([key, value]) => {
    const optional = required.has(key) ? "" : "?";
    const description = value.description === undefined ? "" : `/** ${value.description} */ `;

    return `${description}readonly ${quoteKey(key)}${optional}: ${printNode(value)}`;
  });

  return members.length === 0 ? "{}" : `{ ${members.join("; ")} }`;
};

const primitive = (type: string, node: JsonSchemaNode): string => {
  switch (type) {
    case "string": {
      return node.enum === undefined ? "string" : node.enum.map(literal).join(" | ");
    }

    case "number":
    case "integer": {
      return "number";
    }

    case "boolean": {
      return "boolean";
    }

    case "null": {
      return "null";
    }

    case "array": {
      return node.items === undefined
        ? "ReadonlyArray<unknown>"
        : `ReadonlyArray<${printNode(node.items)}>`;
    }

    case "object": {
      return objectType(node);
    }

    default: {
      return "unknown";
    }
  }
};

export const typeOf = (schema: JsonSchema.JsonSchema): string =>
  Option.match(parseNode(schema), { onNone: () => "unknown", onSome: printNode });

const definitions = (
  schema: JsonSchema.JsonSchema,
): readonly (readonly [string, JsonSchemaNode])[] =>
  Option.match(parseNode(schema), {
    onNone: () => [],
    onSome: (node) => Object.entries(node.$defs ?? {}),
  });

const docComment = (lines: readonly string[]): string =>
  ["/**", ...lines.map((line) => ` * ${line}`), " */"].join("\n");

export const signatureOf = (entry: CatalogEntry): string => {
  const notes = [entry.description];

  if (entry.annotations.readOnly) {
    notes.push("Read-only.");
  }

  if (entry.annotations.destructive) {
    notes.push("Destructive: may irreversibly change state.");
  }

  const failure = typeOf(entry.failure);

  if (failure !== "never") {
    notes.push(`@throws ${failure}`);
  }

  return `${docComment(notes)}\nreadonly ${quoteKey(entry.name)}: (input: ${typeOf(entry.input)}) => Promise<${typeOf(entry.output)}>;`;
};

export const toTypeScript = (catalog: Catalog): string => {
  const named = new Map<string, JsonSchemaNode>();

  for (const entry of catalog.capabilities) {
    for (const [name, schema] of [
      ...definitions(entry.input),
      ...definitions(entry.output),
      ...definitions(entry.failure),
    ]) {
      named.set(name, schema);
    }
  }

  const aliases = [...named].map(([name, node]) => `type ${name} = ${printNode(node)};`);

  const members = catalog.capabilities.map((entry) =>
    signatureOf(entry)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
  );

  return [...aliases, "declare const tools: {", ...members, "};", ""].join("\n");
};

export const namespaceOf = (name: string): string =>
  name.includes(".") ? (name.split(".")[0] ?? "tools") : "tools";

export interface Discovery {
  readonly complete: boolean;
  readonly declarations: string;
  readonly selected: readonly CatalogEntry[];
  readonly summary: string;
  readonly used: number;
}

const CHARACTERS_PER_TOKEN = 4;

const costOf = (entry: CatalogEntry): number =>
  toTypeScript({ capabilities: [entry], version: "1" }).length / CHARACTERS_PER_TOKEN;

export const discoverCatalog = (catalog: Catalog, budget = 2000): Discovery => {
  if (!(budget >= 0 && Number.isSafeInteger(budget))) {
    throw new Error(`discoverCatalog: the budget must be a non-negative integer, got ${budget}`);
  }

  const groups = new Map<string, CatalogEntry[]>();

  for (const entry of catalog.capabilities) {
    const namespace = namespaceOf(entry.name);
    const group = groups.get(namespace) ?? [];

    group.push(entry);
    groups.set(namespace, group);
  }

  const selections = [...groups]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([namespace, entries]) => ({
      entries,
      namespace,
      queue: entries
        .map((entry) => ({ cost: costOf(entry), entry }))
        .toSorted((a, b) => a.cost - b.cost || a.entry.name.localeCompare(b.entry.name)),
      shown: new Array<CatalogEntry>(),
    }));

  let used = 0;
  let active = selections;

  while (active.length > 0) {
    const nextRound: typeof active = [];

    for (const selection of active) {
      const next = selection.queue.shift();

      if (next === undefined || used + next.cost > budget) {
        continue;
      }

      used += next.cost;
      selection.shown.push(next.entry);
      nextRound.push(selection);
    }

    active = nextRound;
  }

  const selected = selections.flatMap((selection) => selection.shown);
  const complete = selected.length === catalog.capabilities.length;

  const status = complete
    ? `COMPLETE list (${selected.length} tools)`
    : `PARTIAL (${selected.length} of ${catalog.capabilities.length} shown)`;

  const summaries = selections.map(
    ({ entries, namespace, shown }) =>
      `${namespace}: ${shown.length === entries.length ? "COMPLETE" : "PARTIAL"} (${shown.length} of ${entries.length} shown)`,
  );

  return {
    complete,
    declarations:
      selected.length === 0 ? "" : toTypeScript({ capabilities: selected, version: "1" }),
    selected,
    summary: [status, ...summaries].join("\n"),
    used,
  };
};
