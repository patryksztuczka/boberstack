import { UserId } from "@boberstack/domain/identity/user";
import { TodoId, TodoTitle } from "@boberstack/domain/todos/todo";
import { assert, describe, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { TodoStore } from "../../modules/todos/index.ts";
import { PgTestLayer } from "../../testing/pg-test.ts";
import { TodoRepositoryLayer } from "./todo.repository.ts";

const alice = UserId.make("user-alice");

const bob = UserId.make("user-bob");

const missingId = TodoId.make("00000000-0000-4000-8000-000000000000");

const createdAt = DateTime.makeUnsafe("2026-10-30T12:00:00.000Z");

const seedUsers = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    insert into "user" ("id", "name", "email", "emailVerified")
    values ('user-alice', 'Alice', 'alice@example.com', true),
           ('user-bob', 'Bob', 'bob@example.com', true)
  `;
});

const TodoStoreOnPostgres = TodoRepositoryLayer.pipe(
  Layer.provideMerge(Layer.effectDiscard(seedUsers).pipe(Layer.provideMerge(PgTestLayer))),
);

describe("TodoStore on Postgres", () => {
  layer(TodoStoreOnPostgres)((it) => {
    it.effect("stores a todo and lists it only for its owner", () =>
      Effect.gen(function* () {
        const store = yield* TodoStore;

        const created = yield* store.insert({
          ownerId: alice,
          title: TodoTitle.make("Write the starter"),
          createdAt,
        });

        const forAlice = yield* store.listByOwner(alice);
        const forBob = yield* store.listByOwner(bob);

        assert.isFalse(created.completed);
        assert.isTrue(DateTime.Equivalence(created.createdAt, createdAt));
        assert.deepStrictEqual(
          forAlice.map((todo) => todo.id),
          [created.id],
        );
        assert.strictEqual(forBob.length, 0);
      }),
    );

    it.effect("updates only the fields in the patch", () =>
      Effect.gen(function* () {
        const store = yield* TodoStore;

        const created = yield* store.insert({
          ownerId: alice,
          title: TodoTitle.make("Ship it"),
          createdAt,
        });

        const updated = yield* store.update(alice, created.id, { completed: true });

        assert.isTrue(Option.isSome(updated));
        assert.strictEqual(Option.getOrUndefined(updated)?.title, "Ship it");
        assert.isTrue(Option.getOrUndefined(updated)?.completed);
      }),
    );

    it.effect("does not let another owner update or remove a todo", () =>
      Effect.gen(function* () {
        const store = yield* TodoStore;

        const created = yield* store.insert({
          ownerId: alice,
          title: TodoTitle.make("Private"),
          createdAt,
        });

        const updatedByBob = yield* store.update(bob, created.id, { completed: true });
        const removedByBob = yield* store.remove(bob, created.id);

        assert.isTrue(Option.isNone(updatedByBob));
        assert.isFalse(removedByBob);
      }),
    );

    it.effect("reports a missing todo", () =>
      Effect.gen(function* () {
        const store = yield* TodoStore;

        assert.isTrue(Option.isNone(yield* store.update(alice, missingId, { completed: true })));
        assert.isFalse(yield* store.remove(alice, missingId));
      }),
    );
  });
});
