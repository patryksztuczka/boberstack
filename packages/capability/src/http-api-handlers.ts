// @effect-diagnostics anyUnknownInErrorContext:off -- the handlers of a list of capabilities are run with their failure types erased; the projected group, RPCs or tools carry each one's failure schema and recover the types for callers.
import { Effect, Schema } from "effect";
import type { Layer } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import type { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";

import type { AnyContract, DecodedInput } from "./contract.ts";
import { hasBody, pathParamNames, routeOf } from "./http-api.ts";
import type { AnyCapability, RequirementsOf } from "./implement.ts";

interface RequestParts {
  readonly params?: DecodedInput | undefined;
  readonly payload?: DecodedInput | undefined;
  readonly query?: DecodedInput | undefined;
}

type RequestHandler = (request: RequestParts) => Effect.Effect<unknown, unknown, unknown>;

interface HandleAll {
  readonly handleAll: (handlers: Readonly<Record<string, RequestHandler>>) => HandleAll;
}

const inputOf = (contract: AnyContract, request: RequestParts) => {
  const route = routeOf(contract);
  const rest = hasBody(route.method) ? request.payload : request.query;

  return pathParamNames(route.path).length === 0
    ? Effect.succeed(rest ?? {})
    : HttpApiError.HttpApiSchemaError.wrap(
        "Params",
        Schema.decodeEffect(Schema.toType(contract.input))({ ...request.params, ...rest }),
      );
};

export type HttpApiHandlersLayer<
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  GroupId extends string,
  Caps extends readonly AnyCapability[],
> = Layer.Layer<
  HttpApiGroup.Service<ApiId, GroupId>,
  never,
  HttpApiEndpoint.ExcludeProvided<
    HttpApiGroup.Endpoints<HttpApiGroup.WithIdentifier<Groups, GroupId>>,
    RequirementsOf<Caps>
  >
>;

export const toHttpApiHandlers = <
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  const GroupId extends HttpApiGroup.Identifier<Groups>,
  const Caps extends readonly AnyCapability[],
>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  groupId: GroupId,
  capabilities: Caps,
): HttpApiHandlersLayer<ApiId, Groups, GroupId, Caps> => {
  const handlers = Object.fromEntries(
    capabilities.map(({ contract, handler }): [string, RequestHandler] => [
      contract.name,
      (request) =>
        Effect.flatMap(inputOf(contract, request), (input) =>
          // SAFETY: HttpApi decoded the params, query and payload with the schemas `toHttpApiGroup` split from this contract's input, and `inputOf` decoded their union with that input, so `input` is what this capability's handler takes.
          handler(input as never),
        ),
    ]),
  );

  const build = (group: HandleAll) => group.handleAll(handlers);

  // SAFETY: `handleAll` wants one handler per endpoint identifier, typed to that endpoint. The record has one per capability, keyed by its contract name, and `toHttpApiGroup` names each endpoint after its contract.
  const layer: unknown = HttpApiBuilder.group(api, groupId, build as never);

  // SAFETY: the group layer runs each capability's handler, so it requires their services minus what the group's middleware provides, which is what `HttpApiHandlersLayer` spells out.
  return layer as HttpApiHandlersLayer<ApiId, Groups, GroupId, Caps>;
};
