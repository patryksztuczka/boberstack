import { tester } from "../../../rule-tester.ts";
import { layerConfigOnlyInRootsRule } from "./layer-config-only-in-roots.ts";

const error = { messageId: "notRoot" };

tester.run("@boberstack/effect/layer-config-only-in-roots", layerConfigOnlyInRootsRule, {
  valid: [
    {
      code: "export const AppLayer = Layer.mergeAll(A.layer).pipe(Layer.provide(Database.layerConfig));",
      filename: "apps/api/src/app.layer.ts",
    },
    {
      code: "export default class Api extends Worker { layer = AppLayer.pipe(Layer.provide(Database.layerConfig)); }",
      filename: "apps/api/src/worker.ts",
    },
    {
      code: "program.pipe(Effect.provide(Database.layerConfig));",
      filename: "apps/cli/src/commands/migrate.ts",
    },
    {
      code: "program.pipe(Effect.provide(Database.layerConfig), NodeRuntime.runMain);",
      filename: "apps/cli/src/main.ts",
    },
    {
      code: 'export const layerConfig = PgClient.layerConfig({ url: Config.Redacted("DATABASE_URL") });',
      filename: "apps/api/src/platform/database/database.layer.ts",
    },
    {
      code: 'class A { static readonly layerConfig = Layer.unwrap(Effect.map(Config.Number("X"), (x) => A.layer({ x }))); }',
      filename: "apps/api/src/modules/todos/todo.service.ts",
    },
    {
      code: "const x = Database.layer({ url, maxConnections: 2 });",
      filename: "apps/api/src/modules/todos/todo.service.test.ts",
    },
  ],
  invalid: [
    {
      code: 'layer(TodosService.layer.pipe(Layer.provide(Database.layerConfig)))("x", (it) => {});',
      filename: "apps/api/src/modules/todos/todo.service.test.ts",
      errors: [error],
    },
    {
      code: "class A { static readonly layer = this.layerNoDeps.pipe(Layer.provide(Database.layerConfig)); }",
      filename: "apps/api/src/modules/todos/todo.service.ts",
      errors: [error],
    },
    {
      code: "program.pipe(Effect.provide(Database.layerConfig));",
      filename: "apps/cli/src/commands/migrate.ts",
      options: [{ allow: ["apps/cli/src/main.ts"] }],
      errors: [error],
    },
  ],
});
