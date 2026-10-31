import { Api } from "@boberstack/domain/api";
import { Layer } from "effect";
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api";

import { HttpAuthenticationLayer } from "../platform/authentication/authentication.layer.ts";
import { HealthHttpLayer } from "./health.http.ts";
import { SignInMethodsHttpLayer } from "./sign-in-methods.http.ts";
import { TodosHttpLayer } from "./todos.http.ts";

export const HttpLayer = Layer.mergeAll(
  HttpApiBuilder.layer(Api, { openapiPath: "/api/openapi.json" }).pipe(
    Layer.provide([HealthHttpLayer, SignInMethodsHttpLayer, TodosHttpLayer]),
    Layer.provide(HttpAuthenticationLayer),
  ),
  HttpApiScalar.layer(Api, { path: "/api/docs" }),
);
