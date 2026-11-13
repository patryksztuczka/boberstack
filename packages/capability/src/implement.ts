import { Effect } from "effect";

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
