import { Context, Effect, Layer, Schema } from "effect";

import { defineContract } from "../contract.ts";
import { implement } from "../implement.ts";
import { BookId } from "./shelf-id.ts";
import { BookNotFoundError, OutOfStockError } from "./shelf.errors.ts";

export class Book extends Schema.Class<Book, { readonly brand: unique symbol }>("Book")({
  id: BookId,
  title: Schema.String,
  format: Schema.Literals(["paper", "audio"]),
}) {}

export class Reader extends Context.Service<Reader, { readonly name: string }>()(
  "boberstack/capability/testing/Reader",
) {}

export class Library extends Context.Service<
  Library,
  { readonly titleOf: (id: typeof BookId.Type) => Effect.Effect<string, BookNotFoundError> }
>()("boberstack/capability/testing/Library") {
  static readonly layer = Layer.succeed(
    Library,
    Library.of({
      titleOf: (id) =>
        id === BookId.make("dune")
          ? Effect.succeed("Dune")
          : Effect.fail(new BookNotFoundError({ id })),
    }),
  );
}

export const ListBooks = defineContract("listBooks", {
  title: "List books",
  description: "List every book on the shelf",
  input: Schema.Struct({}),
  output: Schema.Struct({ books: Schema.Array(Book) }),
  failure: Schema.Never,
  annotations: { readOnly: true, idempotent: true },
  http: { method: "GET", path: "/books" },
});

export const GetBook = defineContract("getBook", {
  title: "Get a book",
  description: "Read one book in the format asked for",
  input: Schema.Struct({
    id: BookId,
    format: Schema.optional(Schema.Literals(["paper", "audio"])),
  }),
  output: Book,
  failure: BookNotFoundError,
  annotations: { readOnly: true },
  http: { method: "GET", path: "/books/:id" },
});

export const AddBook = defineContract("addBook", {
  title: "Add a book",
  description: "Put a book on the shelf",
  input: Schema.Struct({ title: Schema.String }),
  output: Book,
  failure: Schema.Never,
  http: { method: "POST", path: "/books", status: 201 },
});

export const RemoveBook = defineContract("removeBook", {
  title: "Remove a book",
  description: "Take a book off the shelf for good",
  input: Schema.Struct({ id: BookId }),
  output: Schema.Void,
  failure: BookNotFoundError,
  annotations: { destructive: true },
  http: { method: "DELETE", path: "/books/:id" },
});

export const BorrowBook = defineContract("borrowBook", {
  title: "Borrow a book",
  description: "Borrow a book as the current reader",
  input: Schema.Struct({ id: BookId }),
  output: Schema.Struct({ borrower: Schema.String }),
  failure: OutOfStockError,
});

export const ShelfContracts = [ListBooks, GetBook, AddBook, RemoveBook, BorrowBook] as const;

const dune = (format: "paper" | "audio") =>
  new Book({ id: BookId.make("dune"), title: "Dune", format });

export const ShelfCapabilities = [
  implement(ListBooks, () => Effect.succeed({ books: [dune("paper")] })),
  implement(GetBook, ({ id, format }) =>
    Library.use((library) => library.titleOf(id)).pipe(
      Effect.map((title) => new Book({ id, title, format: format ?? "paper" })),
    ),
  ),
  implement(AddBook, ({ title }) =>
    Effect.succeed(new Book({ id: BookId.make("new"), title, format: "paper" })),
  ),
  implement(RemoveBook, ({ id }) =>
    Library.use((library) => library.titleOf(id)).pipe(Effect.asVoid),
  ),
  implement(BorrowBook, ({ id }) =>
    id === BookId.make("dune")
      ? Reader.use((reader) => Effect.succeed({ borrower: reader.name }))
      : Effect.fail(new OutOfStockError({ id })),
  ),
] as const;
