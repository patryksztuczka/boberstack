import type { NewTodo, TodoId, TodoPatch } from "@boberstack/domain/todos/todo";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { runPromise } from "../../../runtime.ts";
import { TodosClient } from "./todos-client.ts";

export const todosQuery = queryOptions({
  queryKey: ["todos"],
  queryFn: ({ signal }) =>
    runPromise(
      TodosClient.use((client) => client.list),
      signal,
    ),
});

const useInvalidateTodos = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: todosQuery.queryKey });
};

export const useCreateTodo = () =>
  useMutation({
    mutationFn: (input: NewTodo) => runPromise(TodosClient.use((client) => client.create(input))),
    onSuccess: useInvalidateTodos(),
  });

export const useUpdateTodo = () =>
  useMutation({
    mutationFn: ({ id, patch }: { readonly id: TodoId; readonly patch: TodoPatch }) =>
      runPromise(TodosClient.use((client) => client.update(id, patch))),
    onSuccess: useInvalidateTodos(),
  });

export const useRemoveTodo = () =>
  useMutation({
    mutationFn: (id: TodoId) => runPromise(TodosClient.use((client) => client.remove(id))),
    onSuccess: useInvalidateTodos(),
  });
