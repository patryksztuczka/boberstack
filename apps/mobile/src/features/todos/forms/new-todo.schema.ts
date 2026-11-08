import { TodoTitle } from "@boberstack/domain/todos/todo";
import type { NewTodo } from "@boberstack/domain/todos/todo";
import { Schema } from "effect";
import type { Option } from "effect";

const NewTodoInput = Schema.Struct({
  title: Schema.Trim.pipe(Schema.decodeTo(TodoTitle)),
});

export const newTodoFrom = (title: string): Option.Option<NewTodo> =>
  Schema.decodeOption(NewTodoInput)({ title });
