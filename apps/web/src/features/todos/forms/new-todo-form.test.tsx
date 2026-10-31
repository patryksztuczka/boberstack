import type { NewTodo } from "@boberstack/domain/todos/todo";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { NewTodoForm } from "./new-todo-form.tsx";

const renderForm = () => {
  const onCreate = vi.fn<(input: NewTodo) => Promise<void>>(() => Promise.resolve());

  render(<NewTodoForm onCreate={onCreate} />);

  return { onCreate, input: screen.getByRole("textbox"), submit: screen.getByRole("button") };
};

describe("NewTodoForm", () => {
  it("submits the trimmed title", async () => {
    const { onCreate, input, submit } = renderForm();

    await userEvent.type(input, "   Write the starter   ");
    await userEvent.click(submit);

    expect(onCreate).toHaveBeenCalledWith({ title: "Write the starter" });
  });

  it("accepts a second todo after the first one was submitted", async () => {
    const { onCreate, input, submit } = renderForm();

    await userEvent.type(input, "First");
    await userEvent.click(submit);
    await userEvent.type(input, "Second");
    await userEvent.click(submit);

    expect(onCreate).toHaveBeenNthCalledWith(2, { title: "Second" });
  });

  it("refuses a blank title and explains why", async () => {
    const { onCreate, input, submit } = renderForm();

    await userEvent.type(input, "    ");
    await userEvent.click(submit);

    expect(onCreate).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
