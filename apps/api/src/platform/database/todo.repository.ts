import { UserId } from "@boberstack/domain/identity/user";
import { Todo, TodoId, TodoPatch, TodoTitle } from "@boberstack/domain/todos/todo";
import { Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

import { TodoStore } from "../../modules/todos/index.ts";

const TodoRow = Schema.Struct({
  id: TodoId,
  title: TodoTitle,
  completed: Schema.Boolean,
  createdAt: Schema.DateTimeUtcFromDate,
});

const InsertTodo = Schema.Struct({
  ownerId: UserId,
  title: TodoTitle,
  createdAt: Schema.DateTimeUtcFromDate,
});

const OwnedTodo = Schema.Struct({ ownerId: UserId, id: TodoId });

const UpdateTodo = Schema.Struct({ ownerId: UserId, id: TodoId, patch: TodoPatch });

const toTodo = (row: typeof TodoRow.Type) => new Todo(row);

export const TodoRepositoryLayer = Layer.effect(
  TodoStore,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const findByOwner = SqlSchema.findAll({
      Request: UserId,
      Result: TodoRow,
      execute: (ownerId) => sql`
        select "id", "title", "completed", "createdAt" from "todo"
        where "ownerId" = ${ownerId}
        order by "createdAt", "id"
      `,
    });

    const insertTodo = SqlSchema.findOne({
      Request: InsertTodo,
      Result: TodoRow,
      execute: (record) => sql`
        insert into "todo" ${sql.insert(record)}
        returning "id", "title", "completed", "createdAt"
      `,
    });

    const updateTodo = SqlSchema.findOneOption({
      Request: UpdateTodo,
      Result: TodoRow,
      execute: ({ ownerId, id, patch }) =>
        Object.keys(patch).length === 0
          ? sql`
              select "id", "title", "completed", "createdAt" from "todo"
              where "id" = ${id} and "ownerId" = ${ownerId}
            `
          : sql`
              update "todo" set ${sql.update(patch)}
              where "id" = ${id} and "ownerId" = ${ownerId}
              returning "id", "title", "completed", "createdAt"
            `,
    });

    const deleteTodo = SqlSchema.findAll({
      Request: OwnedTodo,
      Result: Schema.Struct({ id: TodoId }),
      execute: ({ ownerId, id }) => sql`
        delete from "todo" where "id" = ${id} and "ownerId" = ${ownerId} returning "id"
      `,
    });

    return TodoStore.of({
      listByOwner: (ownerId) =>
        findByOwner(ownerId).pipe(
          Effect.map((rows) => rows.map(toTodo)),
          Effect.orDie,
          Effect.withSpan("TodoRepository.listByOwner"),
        ),
      insert: (record) =>
        insertTodo(record).pipe(
          Effect.map(toTodo),
          Effect.orDie,
          Effect.withSpan("TodoRepository.insert"),
        ),
      update: (ownerId, id, patch) =>
        updateTodo({ ownerId, id, patch }).pipe(
          Effect.map(Option.map(toTodo)),
          Effect.orDie,
          Effect.withSpan("TodoRepository.update"),
        ),
      remove: (ownerId, id) =>
        deleteTodo({ ownerId, id }).pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie,
          Effect.withSpan("TodoRepository.remove"),
        ),
    });
  }),
);
