import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { RpcTest } from "effect/rpc";

import { toRpcGroup, toRpcHandlers } from "./rpc.ts";
import { BookId } from "./testing/shelf-id.ts";
import { BookNotFoundError } from "./testing/shelf.errors.ts";
import { Library, Reader, ShelfCapabilities, ShelfContracts } from "./testing/shelf.ts";

class ShelfRpcs extends toRpcGroup(ShelfContracts) {}

const TestLayer = toRpcHandlers(ShelfRpcs, ShelfCapabilities).pipe(
  Layer.provide(Library.layer),
  Layer.provide(Layer.succeed(Reader, Reader.of({ name: "Ada" }))),
);

describe("toRpcGroup", () => {
  it("tags one RPC per contract with the contract's name", () => {
    assert.deepStrictEqual(
      [...ShelfRpcs.requests.keys()],
      ["listBooks", "getBook", "addBook", "removeBook", "borrowBook"],
    );
  });
});

describe("toRpcHandlers", () => {
  it.layer(TestLayer)((it) => {
    it.effect("runs each capability with the whole input as the payload", () =>
      Effect.gen(function* () {
        const client = yield* RpcTest.makeClient(ShelfRpcs);
        const book = yield* client.getBook({ id: BookId.make("dune"), format: "audio" });
        const { borrower } = yield* client.borrowBook({ id: BookId.make("dune") });

        assert.strictEqual(book.format, "audio");
        assert.strictEqual(borrower, "Ada");
      }),
    );

    it.effect("fails with the contract's failure", () =>
      Effect.gen(function* () {
        const client = yield* RpcTest.makeClient(ShelfRpcs);
        const failure = yield* client.getBook({ id: BookId.make("gone") }).pipe(Effect.flip);

        assert.instanceOf(failure, BookNotFoundError);
      }),
    );
  });
});
