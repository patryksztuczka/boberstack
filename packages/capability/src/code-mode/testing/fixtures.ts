import { Context, Duration, Effect, Layer, Ref, Schema } from "effect";

import { defineContract } from "../../contract.ts";
import { implement } from "../../implement.ts";
import { NotFoundError, ReadFailedError, StorageBudgetExceededError } from "./fixtures.errors.ts";

export class Greeter extends Context.Service<
  Greeter,
  { readonly greet: (name: string) => Effect.Effect<string> }
>()("boberstack/capability/code-mode/testing/Greeter") {
  static readonly layer = Layer.succeed(
    Greeter,
    Greeter.of({ greet: (name) => Effect.succeed(`hello ${name}`) }),
  );
}

export const echo = implement(
  defineContract("echo", {
    title: "Echo text",
    description: "Repeat text a number of times",
    input: Schema.Struct({
      text: Schema.String.annotate({ description: "Text to repeat" }),
      times: Schema.optional(Schema.Finite),
    }),
    output: Schema.Struct({ text: Schema.String }),
    failure: Schema.Never,
    annotations: { idempotent: true, readOnly: true },
  }),
  ({ text, times }) => Effect.succeed({ text: text.repeat(times ?? 1) }),
);

export const greet = implement(
  defineContract("greet", {
    title: "Greet someone",
    description: "Greet someone by name",
    input: Schema.Struct({ name: Schema.String }),
    output: Schema.Struct({ greeting: Schema.String }),
    failure: NotFoundError,
  }),
  ({ name }) =>
    name === "nobody"
      ? Effect.fail(new NotFoundError({ subject: name }))
      : Greeter.use((greeter) => greeter.greet(name)).pipe(
          Effect.map((greeting) => ({ greeting })),
        ),
);

const Mode = Schema.Literals(["fast", "slow"]);

const MixedFields = Schema.Struct({
  enabled: Schema.Boolean,
  mode: Mode,
  tags: Schema.Array(Schema.String),
});

export const mixed = implement(
  defineContract("mixed", {
    title: "Echo a mixed input",
    description: "Echo a mixed input back",
    input: MixedFields,
    output: MixedFields,
    failure: Schema.Never,
  }),
  (input) => Effect.succeed(input),
);

export const noArgs = implement(
  defineContract("noArgs", {
    title: "Return a fixed value",
    description: "Return a fixed value without input",
    input: Schema.Struct({}),
    output: Schema.String,
    failure: Schema.Never,
  }),
  () => Effect.succeed("ready"),
);

export const checkedInput = implement(
  defineContract("checkedInput", {
    title: "Check input",
    description: "Use checked enum and array-length constraints",
    input: Schema.Struct({
      mode: Mode,
      values: Schema.Array(Schema.String).check(Schema.isMinLength(1)).check(Schema.isMaxLength(3)),
    }),
    output: Schema.String,
    failure: Schema.Never,
  }),
  ({ mode, values }) => Effect.succeed(`${mode}:${values.length}`),
);

interface Activity {
  readonly active: number;
  readonly peak: number;
}

export class ProbeActivity extends Context.Service<
  ProbeActivity,
  {
    readonly around: <A, E, R>(run: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    readonly read: (reset: boolean) => Effect.Effect<Activity>;
  }
>()("boberstack/capability/code-mode/testing/ProbeActivity") {
  static readonly layer = Layer.effect(
    ProbeActivity,
    Effect.gen(function* () {
      const state = yield* Ref.make<Activity>({ active: 0, peak: 0 });

      return ProbeActivity.of({
        around: (run) =>
          Ref.update(state, ({ active, peak }) => ({
            active: active + 1,
            peak: Math.max(peak, active + 1),
          })).pipe(
            Effect.andThen(run),
            Effect.ensuring(
              Ref.update(state, ({ active, peak }) => ({ active: active - 1, peak })),
            ),
          ),
        read: (reset) =>
          Ref.modify(state, (current) => [
            current,
            reset ? { active: current.active, peak: current.active } : current,
          ]),
      });
    }),
  );
}

export const probe = implement(
  defineContract("probe", {
    title: "Probe the sandbox",
    description: "Exercise sandbox tool boundaries",
    input: Schema.Struct({
      fail: Schema.optional(Schema.Boolean),
      value: Schema.Int,
      wait: Schema.optional(Schema.Natural),
    }),
    output: Schema.Int,
    failure: StorageBudgetExceededError,
  }),
  ({ fail, value, wait }) =>
    ProbeActivity.use((activity) =>
      activity.around(
        fail === true
          ? Effect.fail(
              new StorageBudgetExceededError({
                message: "The storage statement budget is exhausted",
              }),
            )
          : Effect.sleep(Duration.millis(wait ?? 0)).pipe(Effect.as(value)),
      ),
    ),
);

export const probeMetrics = implement(
  defineContract("probeMetrics", {
    title: "Read probe metrics",
    description: "Read or reset sandbox concurrency measurements",
    input: Schema.Struct({ reset: Schema.optional(Schema.Boolean) }),
    output: Schema.Struct({ active: Schema.Int, peak: Schema.Int }),
    failure: Schema.Never,
  }),
  ({ reset }) => ProbeActivity.use((activity) => activity.read(reset ?? false)),
);

export class ProgramStorage extends Context.Service<
  ProgramStorage,
  { readonly budget: number; readonly label: string }
>()("boberstack/capability/code-mode/testing/ProgramStorage") {}

export const storage = implement(
  defineContract("storage", {
    title: "Use program storage",
    description: "Use the captured per-program storage context",
    input: Schema.Struct({ statements: Schema.Natural }),
    output: Schema.String,
    failure: StorageBudgetExceededError,
  }),
  ({ statements }) =>
    ProgramStorage.use(({ budget, label }) =>
      statements > budget
        ? Effect.fail(
            new StorageBudgetExceededError({
              message: "The storage statement budget is exhausted",
            }),
          )
        : Effect.succeed(label),
    ),
);

export const primitiveFailure = implement(
  defineContract("primitiveFailure", {
    title: "Fail with a string",
    description: "Fail with a plain string",
    input: Schema.Struct({ reason: Schema.String }),
    output: Schema.String,
    failure: Schema.String,
  }),
  ({ reason }) => Effect.fail(reason),
);

export const readFile = implement(
  defineContract("readFile", {
    title: "Read a file",
    description: "Fail with a message that names a host path",
    input: Schema.Struct({ message: Schema.String }),
    output: Schema.String,
    failure: ReadFailedError,
  }),
  ({ message }) => Effect.fail(new ReadFailedError({ message })),
);
