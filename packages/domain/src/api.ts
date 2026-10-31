import { HttpApi, OpenApi } from "effect/http-api";

import { SignInMethodsHttpApi } from "./identity/sign-in-methods.http-api.ts";
import { HealthHttpApi } from "./system/health.http-api.ts";
import { TodosHttpApi } from "./todos/todos.http-api.ts";

export class Api extends HttpApi.make("boberstack")
  .add(HealthHttpApi)
  .add(SignInMethodsHttpApi)
  .add(TodosHttpApi)
  .annotateMerge(OpenApi.annotations({ title: "boberstack API" })) {}
