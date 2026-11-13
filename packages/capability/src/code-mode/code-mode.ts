import { Effect, Match, Schema } from "effect";
import type { Context } from "effect";

import { defineContract } from "../contract.ts";
import type { DecodedInput } from "../contract.ts";
import { implement } from "../implement.ts";
import type { AnyCapability, Capability, RequirementsOf } from "../implement.ts";
import { toToolkit, toToolkitHandlers } from "../toolkit.ts";
import type { ToolkitHandlersLayer, ToolkitOf, ToolsOf } from "../toolkit.ts";
import { searchCatalog } from "./catalog-search.ts";
import { discoverCatalog, toCatalog, toTypeScript } from "./catalog.ts";
import type { Catalog, Discovery } from "./catalog.ts";
import { toolDiagnostic } from "./diagnostic.ts";
import { sandboxRunner } from "./sandbox-runner.ts";
import { ExecuteError, ExecuteFailure } from "./sandbox.errors.ts";
import { invokeFailure, resolveLimits, Sandbox } from "./sandbox.ts";
import type { Invoke, InvokeOutcome, SandboxLimits } from "./sandbox.ts";

export const SearchMatch = Schema.Struct({
  description: Schema.String,
  name: Schema.String,
  score: Schema.Finite,
  signature: Schema.String,
});

export const SearchInput = Schema.Struct({
  query: Schema.String,
  limit: Schema.optional(Schema.Int.check(Schema.isGreaterThan(0))),
  offset: Schema.optional(Schema.Natural),
});

export const SearchResult = Schema.Struct({
  matches: Schema.Array(SearchMatch),
  next: Schema.optionalKey(Schema.NullOr(Schema.Struct({ offset: Schema.Int }))),
  offset: Schema.optionalKey(Schema.Int),
  remaining: Schema.optionalKey(Schema.Int),
  total: Schema.Int,
});

export const ExecuteInput = Schema.Struct({ code: Schema.String });

export const ExecuteResult = Schema.Struct({
  logs: Schema.Array(Schema.String),
  result: Schema.Json,
  toolCalls: Schema.optionalKey(Schema.Array(Schema.String)),
  truncated: Schema.optionalKey(Schema.Boolean),
});

const searchOptions = {
  title: "Search capabilities",
  description:
    "Find capabilities by intent. Returns each match's TypeScript signature for the `tools` object available to `execute`. Call this before `execute` when unsure what exists.",
  input: SearchInput,
  output: SearchResult,
  failure: Schema.Never,
  annotations: { readOnly: true, idempotent: true },
};

const SearchContract = defineContract("search", searchOptions);

const ProgramSearchContract = defineContract("$codemode.search", searchOptions);

const executeContract = (description: string, capabilities: readonly AnyCapability[]) =>
  defineContract("execute", {
    title: "Run a program",
    description,
    input: ExecuteInput,
    output: ExecuteResult,
    failure: ExecuteFailure,
    annotations: {
      readOnly: capabilities.every(({ contract }) => contract.annotations.readOnly),
      destructive: capabilities.some(({ contract }) => contract.annotations.destructive),
      openWorld: capabilities.some(({ contract }) => contract.annotations.openWorld),
    },
  });

type ExecuteContract = ReturnType<typeof executeContract>;

export type CodeModeContracts = readonly [typeof SearchContract, ExecuteContract];

export type CodeModeToolkit = ToolkitOf<CodeModeContracts>;

export type CodeModeCapabilities<Caps extends readonly AnyCapability[]> = readonly [
  Capability<typeof SearchContract, never>,
  Capability<ExecuteContract, RequirementsOf<Caps> | Sandbox>,
];

export type DeclarationPlacement = "inline" | "search";

export interface CodeModeOptions extends SandboxLimits {
  readonly declarations?: DeclarationPlacement | undefined;
  readonly catalogBudget?: number | undefined;
  readonly searchLimit?: number | undefined;
}

export interface CodeModeProjection<Caps extends readonly AnyCapability[]> {
  readonly catalog: Catalog;
  readonly declarations: string;
  readonly toolkit: CodeModeToolkit;
  readonly capabilities: CodeModeCapabilities<Caps>;
}

const searchPage = (catalog: Catalog, query: string, limit: number, offset: number) => {
  const all = searchCatalog(catalog, query, Number.MAX_SAFE_INTEGER);
  const matches = all.slice(offset, offset + limit);
  const remaining = Math.max(0, all.length - offset - matches.length);

  return Effect.succeed({
    matches,
    next: remaining > 0 ? { offset: offset + matches.length } : null,
    offset,
    remaining,
    total: catalog.capabilities.length,
  });
};

const EXECUTE_INTRO =
  "Run a JavaScript program against the capabilities. The program is the body of an async function with `tools` in scope; `return` a JSON value to get it back, and `console.log` is captured into `logs`. Each `tools.<name>(input)` call is validated against that capability's input schema, runs on the host, and resolves with its output or rejects with its declared failure. Execution problems fail with a typed `ExecuteError` carrying kind, message, optional tag, logs, toolCalls, and truncated. `toolCalls` lists admitted calls in order. `truncated` marks output cuts. At most 8 tool calls run concurrently. Only host cancellation interrupts execution.";

const executeDescription = (discovery: Discovery): string =>
  [
    EXECUTE_INTRO,
    "",
    discovery.summary,
    ...(discovery.complete
      ? []
      : [
          "Call `search` first, or call `tools.$codemode.search({ query })` inside the program, to get full signatures for missing capabilities. Repeat the same query with `offset: next.offset` until `next` is null.",
        ]),
    ...(discovery.declarations === ""
      ? []
      : ["", "The `tools` object:", "", "```ts", discovery.declarations.trimEnd(), "```"]),
  ].join("\n");

const DEFAULT_CATALOG_BUDGET = 2000;

const DEFAULT_SEARCH_LIMIT = 5;

export const invokerFor = <const Caps extends readonly AnyCapability[]>(
  capabilities: Caps,
): Effect.Effect<Invoke, never, RequirementsOf<Caps>> =>
  Effect.gen(function* () {
    const context = yield* Effect.context<RequirementsOf<Caps>>();

    const byName = new Map(
      capabilities.map((capability) => [capability.contract.name, capability]),
    );

    const invoke: Invoke = (name, input) => {
      const capability = byName.get(name);

      if (capability === undefined) {
        return Effect.succeed(invokeFailure("UnknownCapability", `No capability named ${name}`));
      }

      const { contract } = capability;

      // SAFETY: `AnyCapability` erases the handler's input and requirements. Its input is decoded with the contract's own schema before the call, and its requirements are part of `RequirementsOf<Caps>`, which `context` carries.
      const handler = capability.handler as (
        input: DecodedInput,
      ) => Effect.Effect<unknown, unknown, RequirementsOf<Caps>>;

      const encodeOutput = Schema.encodeUnknownEffect(contract.output);
      const encodeFailure = Schema.encodeUnknownEffect(contract.failure);

      return Schema.decodeUnknownEffect(contract.input)(input).pipe(
        Effect.matchEffect({
          onFailure: () =>
            Effect.succeed(
              invokeFailure("InvalidInput", "Capability input does not match its schema"),
            ),
          onSuccess: (decoded) =>
            // @effect-diagnostics-next-line anyUnknownInErrorContext:off -- a capability's failure type is erased in the list; it is encoded with its contract's failure schema right below.
            handler(decoded).pipe(
              Effect.provideContext(context),
              Effect.matchEffect({
                onFailure: (failure) =>
                  encodeFailure(failure).pipe(
                    Effect.map((encoded): InvokeOutcome => ({
                      diagnostic: toolDiagnostic(encoded),
                      error: encoded,
                      ok: false,
                    })),
                    Effect.orElseSucceed(() =>
                      invokeFailure(
                        "UnencodableFailure",
                        "Capability failure does not match its declared schema",
                      ),
                    ),
                  ),
                onSuccess: (output) =>
                  encodeOutput(output).pipe(
                    Effect.map((value): InvokeOutcome => ({ ok: true, value })),
                    Effect.orElseSucceed(() =>
                      invokeFailure(
                        "UnencodableOutput",
                        "Capability output does not match its declared schema",
                      ),
                    ),
                  ),
              }),
            ),
        }),
      );
    };

    return invoke;
  });

export const toCodeMode = <const Caps extends readonly [AnyCapability, ...AnyCapability[]]>(
  capabilities: Caps,
  options: CodeModeOptions = {},
): CodeModeProjection<Caps> => {
  const limits = resolveLimits(options);
  const searchLimit = options.searchLimit ?? DEFAULT_SEARCH_LIMIT;
  const catalog = toCatalog(capabilities);
  const names = catalog.capabilities.map((entry) => entry.name);

  const discovery = discoverCatalog(
    catalog,
    options.catalogBudget ??
      Match.value(options.declarations).pipe(
        Match.when("inline", () => Number.MAX_SAFE_INTEGER),
        Match.when("search", () => 0),
        Match.orElse(() => DEFAULT_CATALOG_BUDGET),
      ),
  );

  const search = (input: typeof SearchInput.Type) =>
    searchPage(catalog, input.query, input.limit ?? searchLimit, input.offset ?? 0);

  const programCapabilities = [...capabilities, implement(ProgramSearchContract, search)];

  const execute = implement(
    executeContract(executeDescription(discovery), capabilities),
    Effect.fn("CodeMode.execute")(function* ({ code }: typeof ExecuteInput.Type) {
      const invoke = yield* invokerFor(programCapabilities);
      const sandbox = yield* Sandbox;
      const run = yield* sandboxRunner(sandbox.run, limits)(code, invoke, names);

      const receipts = {
        logs: run.logs,
        toolCalls: run.toolCalls ?? [],
        truncated: run.truncated ?? false,
      };

      if (run.diagnostic !== null && run.diagnostic !== undefined) {
        return yield* new ExecuteError({ ...run.diagnostic, ...receipts });
      }

      return { ...receipts, result: run.result };
    }),
  );

  const codeModeCapabilities: CodeModeCapabilities<Caps> = [
    implement(SearchContract, search),
    execute,
  ];

  return {
    catalog,
    declarations: toTypeScript(catalog),
    toolkit: toToolkit([SearchContract, execute.contract]),
    capabilities: codeModeCapabilities,
  };
};

export type CodeModeHandlersLayer<
  Caps extends readonly AnyCapability[],
  PerRequest,
> = ToolkitHandlersLayer<ToolsOf<CodeModeContracts>, CodeModeCapabilities<Caps>, PerRequest>;

export const toCodeModeHandlers = <const Caps extends readonly AnyCapability[], PerRequest = never>(
  projection: CodeModeProjection<Caps>,
  perRequest: ReadonlyArray<Context.Key<PerRequest, unknown>> = [],
): CodeModeHandlersLayer<Caps, PerRequest> =>
  toToolkitHandlers(projection.toolkit, projection.capabilities, perRequest);
