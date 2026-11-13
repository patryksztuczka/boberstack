import { assert, describe, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path } from "effect";
import { Etag, HttpPlatform } from "effect/http";
import { HttpApi, HttpApiTest, OpenApi } from "effect/http-api";

import { toHttpApiHandlers } from "./http-api-handlers.ts";
import { toHttpApiGroup } from "./http-api.ts";
import { BookId } from "./testing/shelf-id.ts";
import { OutOfStockError } from "./testing/shelf.errors.ts";
import { Library, Reader, ShelfCapabilities, ShelfContracts } from "./testing/shelf.ts";

class ShelfApi extends HttpApi.make("shelf").add(toHttpApiGroup("shelf", ShelfContracts)) {}

const TestLayer = toHttpApiHandlers(ShelfApi, "shelf", ShelfCapabilities).pipe(
  Layer.provide(Library.layer),
  Layer.provide(Layer.succeed(Reader, Reader.of({ name: "Ada" }))),
  Layer.provideMerge(
    Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
      Layer.provideMerge(FileSystem.layerNoop({})),
    ),
  ),
);

const client = HttpApiTest.groups(ShelfApi, ["shelf"]);

describe("toHttpApiGroup", () => {
  it("routes each contract to its method and path, path parameters taken from the input", () => {
    const paths = OpenApi.fromApi(ShelfApi).paths;

    assert.deepStrictEqual(Object.keys(paths).sort(), ["/books", "/books/{id}", "/borrowBook"]);
    assert.isDefined(paths["/books"]?.get);
    assert.isDefined(paths["/books"]?.post);
    assert.isDefined(paths["/books/{id}"]?.delete);
    assert.isDefined(paths["/borrowBook"]?.post);
  });
});

describe("toHttpApiHandlers", () => {
  it.layer(TestLayer)((it) => {
    it.effect("calls a contract without input with no arguments", () =>
      Effect.gen(function* () {
        const shelf = yield* client;
        const { books } = yield* shelf.shelf.listBooks();

        assert.deepStrictEqual(
          books.map((book) => book.title),
          ["Dune"],
        );
      }),
    );

    it.effect("joins path parameters and the query into one input", () =>
      Effect.gen(function* () {
        const shelf = yield* client;

        const book = yield* shelf.shelf.getBook({
          params: { id: BookId.make("dune") },
          query: { format: "audio" },
        });

        assert.strictEqual(book.format, "audio");
        assert.strictEqual(book.title, "Dune");
      }),
    );

    it.effect("answers with the status the route names, and 204 for no output", () =>
      Effect.gen(function* () {
        const shelf = yield* client;

        const [, added] = yield* shelf.shelf.addBook({
          payload: { title: "Emma" },
          responseMode: "decoded-and-response",
        });

        const [, removed] = yield* shelf.shelf.removeBook({
          params: { id: BookId.make("dune") },
          responseMode: "decoded-and-response",
        });

        assert.strictEqual(added.status, 201);
        assert.strictEqual(removed.status, 204);
      }),
    );

    it.effect("keeps a failure's own status and gives an unannotated one 422", () =>
      Effect.gen(function* () {
        const shelf = yield* client;

        const missing = yield* shelf.shelf.getBook({
          params: { id: BookId.make("gone") },
          query: {},
          responseMode: "response-only",
        });

        const outOfStock = yield* shelf.shelf
          .borrowBook({ payload: { id: BookId.make("gone") } })
          .pipe(Effect.flip);

        const outOfStockResponse = yield* shelf.shelf.borrowBook({
          payload: { id: BookId.make("gone") },
          responseMode: "response-only",
        });

        assert.strictEqual(missing.status, 404);
        assert.instanceOf(outOfStock, OutOfStockError);
        assert.strictEqual(outOfStockResponse.status, 422);
      }),
    );
  });
});
