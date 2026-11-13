import { assert, describe, it } from "@effect/vitest";
import { Schema } from "effect";

import { searchCatalog } from "./catalog-search.ts";
import { discoverCatalog, toCatalog, toTypeScript, typeOf } from "./catalog.ts";
import type { Catalog, CatalogEntry } from "./catalog.ts";
import { echo, greet, mixed } from "./testing/fixtures.ts";

const catalog = toCatalog([echo, greet, mixed]);

const firstOf = (entries: readonly CatalogEntry[]): CatalogEntry => {
  const [first] = entries;

  if (first === undefined) {
    throw new Error("The catalog fixture must have an entry");
  }

  return first;
};

const seed = firstOf(catalog.capabilities);

const counts = Schema.Array(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 4 }))).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(4),
);

const entryOf = (entry: Partial<CatalogEntry> & { readonly name: string }): CatalogEntry => ({
  ...seed,
  ...entry,
});

const groupedCatalog = (sizes: readonly number[]): Catalog => ({
  capabilities: sizes.flatMap((size, namespace) =>
    Array.from({ length: size }, (_, index) =>
      entryOf({ name: `namespace${namespace}.tool${index}` }),
    ),
  ),
  version: "1",
});

const costOf = (entries: readonly CatalogEntry[]) =>
  entries.reduce(
    (sum, entry) => sum + toTypeScript({ capabilities: [entry], version: "1" }).length / 4,
    0,
  );

describe("discoverCatalog", () => {
  it.prop(
    "a full budget lists every signature and zero lists only namespaces",
    { sizes: counts },
    ({ sizes }) => {
      const generated = groupedCatalog(sizes);
      const full = discoverCatalog(generated, Number.MAX_SAFE_INTEGER);
      const empty = discoverCatalog(generated, 0);

      assert.lengthOf(full.selected, generated.capabilities.length);
      assert.strictEqual(full.complete, true);
      assert.lengthOf(empty.selected, 0);
      assert.strictEqual(empty.declarations, "");

      for (const entry of generated.capabilities) {
        assert.include(full.declarations, `readonly "${entry.name}":`);
      }

      assert.deepStrictEqual(
        empty.summary.split("\n").slice(1),
        sizes.map((size, namespace) => `namespace${namespace}: PARTIAL (0 of ${size} shown)`),
      );
    },
  );

  it("groups unqualified capabilities under tools", () => {
    assert.deepStrictEqual(discoverCatalog(catalog, 0).summary.split("\n"), [
      "PARTIAL (0 of 3 shown)",
      "tools: PARTIAL (0 of 3 shown)",
    ]);
  });

  it.prop(
    "round robin shows every affordable namespace before repeating one",
    { sizes: counts },
    ({ sizes }) => {
      const generated = groupedCatalog(sizes);
      const oneCost = costOf(generated.capabilities.slice(0, 1));
      const firstRound = discoverCatalog(generated, oneCost * sizes.length);

      assert.deepStrictEqual(
        firstRound.selected.map((entry) => entry.name),
        sizes.map((_, namespace) => `namespace${namespace}.tool0`),
      );
    },
  );

  it.prop(
    "selected signatures never exceed their estimated token budget",
    { budget: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 3000 })), sizes: counts },
    ({ budget, sizes }) => {
      const selection = discoverCatalog(groupedCatalog(sizes), budget);
      const actual = costOf(selection.selected);

      assert.isAtMost(actual, budget);
      assert.strictEqual(selection.used, actual);
    },
  );
});

describe("toCatalog", () => {
  it("records every capability with a JSON Schema for its input, output and failure", () => {
    const [, greetEntry] = catalog.capabilities;

    assert.strictEqual(catalog.version, "1");
    assert.deepStrictEqual(
      catalog.capabilities.map((entry) => entry.name),
      ["echo", "greet", "mixed"],
    );
    assert.containSubset(greetEntry?.input, {
      properties: { name: { type: "string" } },
      required: ["name"],
      type: "object",
    });
    assert.containSubset(greetEntry?.failure, { $ref: "#/$defs/NotFoundErrorEncoded" });
  });
});

describe("typeOf", () => {
  it("prints the JSON Schema shapes Effect emits", () => {
    assert.strictEqual(typeOf({ enum: ["fast", "slow"], type: "string" }), '"fast" | "slow"');
    assert.strictEqual(typeOf({ anyOf: [{ type: "number" }, { type: "null" }] }), "number | null");
    assert.strictEqual(
      typeOf({ items: { type: "string" }, type: "array" }),
      "ReadonlyArray<string>",
    );
    assert.strictEqual(typeOf({ not: {} }), "never");
    assert.strictEqual(typeOf({ $ref: "#/$defs/NotFoundErrorEncoded" }), "NotFoundErrorEncoded");
    assert.strictEqual(typeOf({ type: 7 }), "unknown");
  });

  it.prop(
    "prints each union member once, in first-seen order",
    {
      members: Schema.Array(Schema.Literals(["string", "number", "boolean", "null"])).check(
        Schema.isMinLength(1),
      ),
    },
    ({ members }) => {
      const expected = [...new Set(members)].join(" | ");

      assert.strictEqual(typeOf({ anyOf: members.map((type) => ({ type })) }), expected);
      assert.strictEqual(typeOf({ oneOf: members.map((type) => ({ type })) }), expected);
      assert.strictEqual(typeOf({ type: [...members] }), expected);
    },
  );
});

describe("toTypeScript", () => {
  it("declares named failures and a tools object with doc comments", () => {
    const declarations = toTypeScript(catalog);

    assert.include(
      declarations,
      'type NotFoundErrorEncoded = { readonly _tag: "NotFoundError"; readonly subject: string };',
    );
    assert.include(declarations, "declare const tools: {");
    assert.include(
      declarations,
      "readonly greet: (input: { readonly name: string }) => Promise<{ readonly greeting: string }>;",
    );
    assert.include(declarations, "@throws NotFoundErrorEncoded");
    assert.include(declarations, "Read-only.");
    assert.include(declarations, "readonly text: string; readonly times?: number | null");
  });
});

describe("searchCatalog", () => {
  it.prop(
    "ranking is stable under catalog permutations and pages cover every match once",
    { pageSize: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 5 })), sizes: counts },
    ({ pageSize, sizes }) => {
      const generated = groupedCatalog(sizes);
      const all = searchCatalog(generated, "tool", Number.MAX_SAFE_INTEGER);

      const reversed = searchCatalog(
        { ...generated, capabilities: generated.capabilities.toReversed() },
        "tool",
        Number.MAX_SAFE_INTEGER,
      );

      const pages = Array.from({ length: Math.ceil(all.length / pageSize) }, (_, index) =>
        searchCatalog(generated, "tool", pageSize, index * pageSize),
      ).flat();

      assert.deepStrictEqual(reversed, all);
      assert.deepStrictEqual(pages, all);
      assert.strictEqual(
        new Set(pages.map((match) => match.name)).size,
        generated.capabilities.length,
      );
    },
  );

  it.prop(
    "an exact path query isolates its tool regardless of competing descriptions",
    { sizes: counts },
    ({ sizes }) => {
      const generated = groupedCatalog(sizes);

      for (const entry of generated.capabilities) {
        for (const query of [
          entry.name,
          `tools.${entry.name}`,
          `tools[${JSON.stringify(entry.name)}]`,
        ]) {
          assert.deepStrictEqual(
            searchCatalog(generated, query).map((match) => match.name),
            [entry.name],
          );
        }
      }
    },
  );

  it.prop(
    "path segment, path substring, description and input description weigh less in that order",
    { id: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 100 })) },
    ({ id }) => {
      const word = `ticket${id}`;

      const generated: Catalog = {
        capabilities: [
          entryOf({ description: "", input: {}, name: `root.${word}` }),
          entryOf({ description: "", input: {}, name: `root.${word}ing` }),
          entryOf({ description: word, input: {}, name: "root.summary" }),
          entryOf({
            description: "",
            input: {
              properties: { value: { description: word, type: "string" } },
              type: "object",
            },
            name: "root.last",
          }),
        ],
        version: "1",
      };

      assert.deepStrictEqual(
        searchCatalog(generated, word).map((match) => match.name),
        generated.capabilities.map((entry) => entry.name),
      );
    },
  );

  it("ranks by name, then description and input overlap", () => {
    const matches = searchCatalog(catalog, "greet someone by name");

    assert.strictEqual(matches[0]?.name, "greet");
    assert.include(matches[0]?.signature, "readonly greet:");
    assert.strictEqual(
      matches.every((match) => match.score > 0),
      true,
    );
  });

  it("returns everything for an empty query, within the limit", () => {
    assert.lengthOf(searchCatalog(catalog, "", 2), 2);
    assert.lengthOf(searchCatalog(catalog, ""), 3);
  });

  it("returns nothing when no token matches", () => {
    assert.lengthOf(searchCatalog(catalog, "zebra"), 0);
  });

  it.prop(
    "unparseable input metadata contributes no search terms",
    { word: Schema.String.check(Schema.isPattern(/^[abcgjklquvwxyz]{1,12}$/u)) },
    ({ word }) => {
      const invalidMetadata: Catalog = {
        capabilities: [
          entryOf({ description: "Reports the 42nd item", input: { type: 7 }, name: "root.find" }),
        ],
        version: "1",
      };

      for (const query of [word, "xyzzy"]) {
        assert.deepStrictEqual(searchCatalog(invalidMetadata, query), []);
      }

      assert.strictEqual(searchCatalog(invalidMetadata, "")[0]?.score, 0);
      assert.deepStrictEqual(
        searchCatalog(invalidMetadata, "reports").map((match) => match.name),
        ["root.find"],
      );
    },
  );
});
