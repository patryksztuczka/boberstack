import { HttpApi, OpenApi } from "effect/http-api";

import { HealthHttpApi } from "./system/health.http-api.ts";
import { TodosHttpApi } from "./todos/todos.http-api.ts";

export class Api extends HttpApi.make("boberstack")
  .add(HealthHttpApi)
  .add(TodosHttpApi)
  .annotateMerge(OpenApi.annotations({ title: "Effect Starter API" })) {}
