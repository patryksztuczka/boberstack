import { tester } from "../../../rule-tester.ts";
import { serviceExplicitApiRule } from "./service-explicit-shape.ts";

const error = { messageId: "missingApi" };

tester.run("@boberstack/effect/service-explicit-shape", serviceExplicitApiRule, {
  valid: [
    'import { Context, Effect } from "effect"; export class TodoCatalog extends Context.Service<TodoCatalog, { readonly find: (id: string) => Effect.Effect<number> }>()("boberstack/todos/TodoCatalog") {}',
    'import { Context } from "effect"; export const Db = Context.Service<DbApi>("boberstack/platform/database/Db");',
    'const Context = { Service: () => () => class {} }; class X extends Context.Service<X>()("x") {}',
  ],
  invalid: [
    {
      code: 'import { Context, Effect } from "effect"; export class TodoCatalog extends Context.Service<TodoCatalog>()("boberstack/todos/TodoCatalog", { make: Effect.succeed({}) }) {}',
      errors: [error],
    },
    {
      code: 'import { Context } from "effect"; class X extends Context.Service()("x") {}',
      errors: [error],
    },
  ],
});
