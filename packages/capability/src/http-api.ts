import { Predicate, Schema, SchemaAST } from "effect";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api";

import type {
  AnyContract,
  FailureOf,
  HttpMethod,
  HttpRoute,
  HttpRouteOf,
  InputOf,
  InputSchema,
  NameOf,
  OutputOf,
  PathParamNames,
} from "./contract.ts";

type BodyMethod = "PATCH" | "POST" | "PUT";

const BODY_METHODS: ReadonlySet<HttpMethod> = new Set(["PATCH", "POST", "PUT"]);

export const hasBody = (method: HttpMethod) => BODY_METHODS.has(method);

export const pathParamNames = (path: string): readonly string[] =>
  path
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));

const UNANNOTATED_FAILURE_STATUS = 422;

const withFailureStatus = (failure: Schema.Top): Schema.Top =>
  failure.ast.annotations?.["httpApiStatus"] === undefined
    ? failure.annotate({ httpApiStatus: UNANNOTATED_FAILURE_STATUS })
    : failure;

const membersOf = (failure: Schema.Top): readonly Schema.Top[] => {
  if (SchemaAST.isNever(failure.ast)) {
    return [];
  }

  if (
    !SchemaAST.isUnion(failure.ast) ||
    failure.ast.annotations?.["httpApiStatus"] !== undefined ||
    !Predicate.hasProperty(failure, "members") ||
    !Array.isArray(failure.members)
  ) {
    return [failure];
  }

  return failure.members.filter((member) => Schema.isSchema(member));
};

const httpFailures = (contract: AnyContract): readonly Schema.Top[] =>
  membersOf(contract.failure).map(withFailureStatus);

const successStatusOf = (contract: AnyContract): number | undefined =>
  contract.http?.status ?? (HttpApiSchema.isNoContent(contract.output.ast) ? 204 : undefined);

const successOf = (contract: AnyContract): Schema.Top => {
  const status = successStatusOf(contract);

  return status === undefined
    ? contract.output
    : contract.output.pipe(HttpApiSchema.status(status));
};

interface EndpointParts {
  readonly error: readonly Schema.Top[];
  readonly params?: Schema.Top | undefined;
  readonly payload?: Schema.Top | undefined;
  readonly query?: Schema.Top | undefined;
  readonly success: Schema.Top;
}

const make: unknown = HttpApiEndpoint.make;

// SAFETY: `HttpApiEndpoint.make(method)` rejects a generic error schema only through a non-exported stream check that a generic `Failure` cannot satisfy. A contract's failure is never a stream, and `EndpointOf` names the precise endpoint type for callers.
const endpoint = make as (
  method: HttpMethod,
) => (name: string, path: `/${string}`, parts: EndpointParts) => HttpApiEndpoint.Constraint;

const fieldsNamed = (input: InputSchema, names: readonly string[], keep: boolean) =>
  Schema.Struct(
    Object.fromEntries(
      Object.entries(input.fields).filter(([name]) => names.includes(name) === keep),
    ),
  );

export const routeOf = (contract: AnyContract): HttpRoute =>
  contract.http ?? { method: "POST", path: `/${contract.name}` };

const endpointFor = (contract: AnyContract): HttpApiEndpoint.Constraint => {
  const route = routeOf(contract);
  const names = pathParamNames(route.path);

  for (const name of names) {
    if (!Object.hasOwn(contract.input.fields, name)) {
      throw new Error(
        `toHttpApiGroup: ${contract.name}'s path ${route.path} names :${name}, which is not an input field`,
      );
    }
  }

  const rest = names.length === 0 ? contract.input : fieldsNamed(contract.input, names, false);
  const restPart = Object.keys(rest.fields).length === 0 ? undefined : rest;

  return endpoint(route.method)(contract.name, route.path, {
    error: httpFailures(contract),
    params: names.length === 0 ? undefined : fieldsNamed(contract.input, names, true),
    success: successOf(contract),
    payload: hasBody(route.method) ? restPart : undefined,
    query: hasBody(route.method) ? undefined : restPart,
  });
};

type ParamFieldsOf<C, Path extends string> = Pick<
  InputOf<C>["fields"],
  PathParamNames<Path> & keyof InputOf<C>["fields"]
>;

type RestFieldsOf<C, Path extends string> = Omit<InputOf<C>["fields"], PathParamNames<Path>>;

type RestOf<C, Path extends string> = [keyof RestFieldsOf<C, Path>] extends [never]
  ? never
  : Schema.Struct<RestFieldsOf<C, Path>>;

type RoutedEndpointOf<C, Route extends HttpRoute> = HttpApiEndpoint.HttpApiEndpoint<
  NameOf<C>,
  Route["method"],
  Route["path"],
  [PathParamNames<Route["path"]>] extends [never]
    ? never
    : Schema.Struct<ParamFieldsOf<C, Route["path"]>>,
  Route["method"] extends BodyMethod ? never : RestOf<C, Route["path"]>,
  Route["method"] extends BodyMethod ? RestOf<C, Route["path"]> : never,
  never,
  OutputOf<C>,
  FailureOf<C>
>;

export type EndpointOf<C> =
  HttpRouteOf<C> extends HttpRoute
    ? RoutedEndpointOf<C, HttpRouteOf<C>>
    : RoutedEndpointOf<C, { readonly method: "POST"; readonly path: `/${NameOf<C>}` }>;

export type EndpointsOf<Contracts extends readonly AnyContract[]> = {
  readonly [K in keyof Contracts]: EndpointOf<Contracts[K]>;
};

export type HttpApiGroupOf<
  Id extends string,
  Contracts extends readonly AnyContract[],
> = HttpApiGroup.HttpApiGroup<Id, EndpointsOf<Contracts>[number]>;

export const toHttpApiGroup = <
  const Id extends string,
  const Contracts extends readonly [AnyContract, ...AnyContract[]],
>(
  id: Id,
  contracts: Contracts,
): HttpApiGroupOf<Id, Contracts> => {
  const [first, ...rest] = contracts.map(endpointFor);

  if (first === undefined) {
    throw new Error(`toHttpApiGroup: ${id} needs at least one contract`);
  }

  const group: unknown = HttpApiGroup.make(id).add(first, ...rest);

  // SAFETY: the group holds exactly one endpoint per contract, built from that contract's name, route and schemas, which is what `EndpointsOf` spells out per contract.
  return group as HttpApiGroupOf<Id, Contracts>;
};
