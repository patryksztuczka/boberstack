import { HttpAuthenticationLayer } from "@boberstack/auth";
import { toHttpApiHandlers } from "@boberstack/capability";
import { Api } from "@boberstack/domain/api";
import { Layer } from "effect";
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api";

import { TodosCapabilities } from "../capabilities/todos.capabilities.ts";
import { HealthHttpLayer } from "./health.http.ts";
import { SignInMethodsHttpLayer } from "./sign-in-methods.http.ts";

export const HttpLayer = Layer.mergeAll(
  HttpApiBuilder.layer(Api, { openapiPath: "/api/openapi.json" }).pipe(
    Layer.provide([
      HealthHttpLayer,
      SignInMethodsHttpLayer,
      toHttpApiHandlers(Api, "todos", TodosCapabilities),
    ]),
    Layer.provide(HttpAuthenticationLayer),
  ),
  HttpApiScalar.layer(Api, { path: "/api/docs" }),
);
