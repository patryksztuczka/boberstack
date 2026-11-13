// @effect-diagnostics anyUnknownInErrorContext:off -- the handlers of a list of capabilities are run with their failure types erased; the projected group, RPCs or tools carry each one's failure schema and recover the types for callers.
import { Effect } from "effect";
import type { Layer } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import type { AnyContract, FailureOf, InputOf, NameOf, OutputOf } from "./contract.ts";
import type { AnyCapability, RequirementsOf } from "./implement.ts";

export type RpcOf<C> = Rpc.Rpc<NameOf<C>, InputOf<C>, OutputOf<C>, FailureOf<C>>;

export type RpcsOf<Contracts extends readonly AnyContract[]> = {
  readonly [K in keyof Contracts]: RpcOf<Contracts[K]>;
};

export type RpcGroupOf<Contracts extends readonly AnyContract[]> = RpcGroup.RpcGroup<
  RpcsOf<Contracts>[number]
>;

const rpcFor = (contract: AnyContract) =>
  Rpc.make(contract.name, {
    payload: contract.input,
    success: contract.output,
    error: contract.failure,
  });

export const toRpcGroup = <const Contracts extends readonly AnyContract[]>(
  contracts: Contracts,
): RpcGroupOf<Contracts> => {
  const group: unknown = RpcGroup.make(...contracts.map(rpcFor));

  // SAFETY: the group holds one RPC per contract, tagged with its name and built from its schemas, which is what `RpcsOf` spells out per contract.
  return group as RpcGroupOf<Contracts>;
};

export type RpcHandlersLayer<
  Rpcs extends Rpc.Any,
  Caps extends readonly AnyCapability[],
> = Layer.Layer<
  Rpc.ToHandler<Rpcs>,
  never,
  Exclude<RequirementsOf<Caps>, MiddlewareProvides<Rpcs>>
>;

type MiddlewareProvides<Rpcs extends Rpc.Any> = Rpcs extends Rpc.Any
  ? Rpc.ExtractProvides<Rpcs, Rpcs["_tag"]>
  : never;

export const toRpcHandlers = <Rpcs extends Rpc.Any, const Caps extends readonly AnyCapability[]>(
  group: RpcGroup.RpcGroup<Rpcs>,
  capabilities: Caps,
): RpcHandlersLayer<Rpcs, Caps> => {
  const layer: unknown = group.toLayer(
    Effect.gen(function* () {
      const context = yield* Effect.context();

      const handlers: unknown = Object.fromEntries(
        capabilities.map(({ contract, handler }) => {
          return [
            contract.name,
            (payload: never) => handler(payload).pipe(Effect.provideContext(context)),
          ];
        }),
      );

      // SAFETY: one handler per capability, keyed by its contract name, which `toRpcGroup` uses as each RPC's tag.
      return handlers as RpcGroup.HandlersFrom<Rpcs>;
    }),
  );

  // SAFETY: the handlers run in the context the layer was built in, so the layer requires the capabilities' services minus what the group's middleware provides, as `RpcHandlersLayer` spells out.
  return layer as RpcHandlersLayer<Rpcs, Caps>;
};
