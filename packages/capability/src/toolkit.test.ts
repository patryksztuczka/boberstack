import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Exit, Layer, Option, Stream } from "effect";
import { Tool } from "effect/ai";

import { BookId } from "./testing/shelf-id.ts";
import { Library, Reader, ShelfCapabilities, ShelfContracts } from "./testing/shelf.ts";
import { toToolkit, toToolkitHandlers } from "./toolkit.ts";

const ShelfToolkit = toToolkit(ShelfContracts);

const TestLayer = toToolkitHandlers(ShelfToolkit, ShelfCapabilities, [Reader]).pipe(
  Layer.provide(Library.layer),
);

const borrow = (id: typeof BookId.Type) =>
  Effect.gen(function* () {
    const toolkit = yield* ShelfToolkit;
    const results = yield* toolkit.handle("borrowBook", { id });

    return yield* Stream.runLast(results);
  });

describe("toToolkit", () => {
  it("carries each contract's title and annotations onto its tool", () => {
    const { listBooks, removeBook } = ShelfToolkit.tools;

    assert.deepStrictEqual(
      Context.getOption(listBooks.annotations, Tool.Title),
      Option.some("List books"),
    );
    assert.isTrue(Context.get(listBooks.annotations, Tool.Readonly));
    assert.isTrue(Context.get(removeBook.annotations, Tool.Destructive));
    assert.isFalse(Context.get(removeBook.annotations, Tool.OpenWorld));
  });

  it("gives a contract without input fields an object JSON Schema", () => {
    assert.strictEqual(Tool.getJsonSchema(ShelfToolkit.tools.listBooks)["type"], "object");
  });
});

describe("toToolkitHandlers", () => {
  it.layer(TestLayer)((it) => {
    it.effect("runs a capability with the per-request services of the caller", () =>
      Effect.gen(function* () {
        const result = yield* borrow(BookId.make("dune")).pipe(
          Effect.provideService(Reader, Reader.of({ name: "Ada" })),
        );

        assert.deepStrictEqual(
          Option.map(result, ({ result }) => result),
          Option.some({ borrower: "Ada" }),
        );
      }),
    );

    it.effect("dies naming the per-request service the transport did not provide", () =>
      Effect.gen(function* () {
        const exit = yield* borrow(BookId.make("dune")).pipe(Effect.exit);

        assert.isTrue(Exit.isFailure(exit));
        assert.include(String(exit), "boberstack/capability/testing/Reader");
      }),
    );
  });
});
