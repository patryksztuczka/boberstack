import { Context, Effect } from "effect";

import type { AnyContract, FailureOf, InputOf, OutputOf } from "./contract.ts";

export interface Capability<C extends AnyContract, Requirements> {
  readonly contract: C;
  readonly handler: (
    input: InputOf<C>["Type"],
  ) => Effect.Effect<OutputOf<C>["Type"], FailureOf<C>["Type"], Requirements>;
}

export interface AnyCapability {
  readonly contract: AnyContract;
  readonly handler: (input: never) => Effect.Effect<unknown, unknown, unknown>;
}

export type RequirementsOf<Caps extends readonly AnyCapability[]> = Caps[number] extends infer Each
  ? Each extends {
      readonly handler: (input: never) => Effect.Effect<unknown, unknown, infer Requirements>;
    }
    ? Requirements
    : never
  : never;

export type ContractsOf<Caps extends readonly AnyCapability[]> = {
  readonly [K in keyof Caps]: Caps[K]["contract"];
};

export const implement = <C extends AnyContract, Requirements = never>(
  contract: C,
  handler: (
    input: InputOf<C>["Type"],
  ) => Effect.Effect<OutputOf<C>["Type"], FailureOf<C>["Type"], Requirements>,
): Capability<C, Requirements> => ({
  contract,
  handler: (input) =>
    handler(input).pipe(
      Effect.withSpan(`capability.${contract.name}`, {
        attributes: { "capability.name": contract.name },
      }),
    ),
});

export const withLayerServices =
  <Services>(layerServices: Context.Context<Services>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, Services>> =>
    Effect.updateContext(
      effect,
      (request: Context.Context<Exclude<R, Services>>) =>
        // SAFETY: the merge holds every service of `R`: `Services` from the layer and the rest from the request, which wins where both hold one.
        Context.merge(layerServices, request) as Context.Context<R>,
    );
