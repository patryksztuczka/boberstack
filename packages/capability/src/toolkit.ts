// @effect-diagnostics anyUnknownInErrorContext:off -- the handlers of a list of capabilities are run with their failure types erased; the projected group, RPCs or tools carry each one's failure schema and recover the types for callers.
import { Effect, Option } from "effect";
import type { Context, Layer } from "effect";
import { Tool, Toolkit } from "effect/ai";

import type {
  AnyContract,
  FailureOf,
  InputOf,
  InputSchema,
  NameOf,
  OutputOf,
  PlainSchema,
} from "./contract.ts";
import type { AnyCapability, RequirementsOf } from "./implement.ts";

const toolWithParameters = <
  Name extends string,
  Input extends InputSchema,
  Output extends PlainSchema,
  Failure extends PlainSchema,
>(
  name: Name,
  description: string,
  parameters: Input,
  success: Output,
  failure: Failure,
) => Tool.make(name, { description, parameters, success, failure });

export type ToolOf<C> = ReturnType<
  typeof toolWithParameters<NameOf<C>, InputOf<C>, OutputOf<C>, FailureOf<C>>
>;

export type ToolsOf<Contracts extends readonly AnyContract[]> = {
  readonly [C in Contracts[number] as NameOf<C>]: ToolOf<C>;
};

export type ToolkitOf<Contracts extends readonly AnyContract[]> = Toolkit.Toolkit<
  ToolsOf<Contracts>
>;

const toolFor = (contract: AnyContract) => {
  const tool =
    Object.keys(contract.input.fields).length === 0
      ? Tool.make(contract.name, {
          description: contract.description,
          success: contract.output,
          failure: contract.failure,
        })
      : toolWithParameters(
          contract.name,
          contract.description,
          contract.input,
          contract.output,
          contract.failure,
        );

  return tool
    .annotate(Tool.Title, contract.title)
    .annotate(Tool.Readonly, contract.annotations.readOnly)
    .annotate(Tool.Destructive, contract.annotations.destructive)
    .annotate(Tool.Idempotent, contract.annotations.idempotent)
    .annotate(Tool.OpenWorld, contract.annotations.openWorld);
};

export const toToolkit = <const Contracts extends readonly AnyContract[]>(
  contracts: Contracts,
): ToolkitOf<Contracts> => {
  const toolkit: unknown = Toolkit.make(...contracts.map(toolFor));

  // SAFETY: the toolkit holds one tool per contract, named after it and built from its schemas, which is what `ToolsOf` spells out per contract.
  return toolkit as ToolkitOf<Contracts>;
};

export type ToolkitHandlersLayer<
  Tools extends Record<string, Tool.Any>,
  Caps extends readonly AnyCapability[],
  PerRequest,
> = Layer.Layer<Tool.HandlersFor<Tools>, never, Exclude<RequirementsOf<Caps>, PerRequest>>;

export const toToolkitHandlers = <
  Tools extends Record<string, Tool.Any>,
  const Caps extends readonly AnyCapability[],
  PerRequest = never,
>(
  toolkit: Toolkit.Toolkit<Tools>,
  capabilities: Caps,
  perRequest: ReadonlyArray<Context.Key<PerRequest, unknown>> = [],
): ToolkitHandlersLayer<Tools, Caps, PerRequest> => {
  const requirePerRequest = Effect.forEach(
    perRequest,
    (key) =>
      Effect.serviceOption(key).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.die(`${key.key} must be provided per request by the transport`),
            onSome: () => Effect.void,
          }),
        ),
      ),
    { discard: true },
  );

  const layer: unknown = toolkit.toLayer(
    Effect.gen(function* () {
      const context = yield* Effect.context();

      const handlers: unknown = Object.fromEntries(
        capabilities.map(({ contract, handler }) => {
          return [
            contract.name,
            (parameters: never) =>
              requirePerRequest.pipe(
                Effect.andThen(handler(parameters)),
                Effect.provideContext(context),
              ),
          ];
        }),
      );

      // SAFETY: one handler per capability, keyed by its contract name, which `toToolkit` uses as each tool's name.
      return handlers as Toolkit.HandlersFrom<Tools>;
    }),
  );

  // SAFETY: the handlers run in the context the layer was built in, merged over the request's own, so the layer needs the capabilities' services except the per-request ones a transport middleware provides.
  return layer as ToolkitHandlersLayer<Tools, Caps, PerRequest>;
};
