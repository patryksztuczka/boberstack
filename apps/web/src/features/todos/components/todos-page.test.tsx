import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import { SignInMethodsClient } from "@boberstack/client-runtime/identity";
import { TodosClient } from "@boberstack/client-runtime/todos";
import { Todo, TodoId } from "@boberstack/domain/todos/todo";
import { RegistryProvider } from "@effect/atom-react";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DateTime, Effect, Layer, Ref } from "effect";
import { Atom } from "effect/reactivity";
import { describe, expect, it } from "vite-plus/test";

import { TodosPage } from "./todos-page.tsx";

const todosInMemory = Layer.mergeAll(
  Layer.effect(
    TodosClient,
    Effect.map(Ref.make<ReadonlyArray<Todo>>([]), (stored) =>
      TodosClient.of({
        list: Ref.get(stored),
        create: (input) =>
          Ref.modify(stored, (current) => {
            const todo = new Todo({
              id: TodoId.make("3f0c5c1e-8a4b-4c3e-9a51-6f1f2d1b7c10"),
              title: input.title,
              completed: false,
              createdAt: DateTime.makeUnsafe("2026-10-30T09:00:00.000Z"),
            });

            return [todo, [...current, todo]];
          }),
        update: () => Effect.die("unused"),
        remove: () => Effect.die("unused"),
      }),
    ),
  ),
  Layer.mock(SignInMethodsClient, {}),
);

describe("TodosPage", () => {
  it("shows a todo it just created", async () => {
    render(
      <RegistryProvider initialValues={[Atom.initialValue(clientLayer, todosInMemory)]}>
        <TodosPage />
      </RegistryProvider>,
    );

    expect(await screen.findByText(/Nothing to do/)).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox"), "Write the starter");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Write the starter")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
