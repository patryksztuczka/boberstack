export {
  discoverCatalog,
  signatureOf,
  toCatalog,
  toTypeScript,
  typeOf,
  type Catalog,
  type CatalogEntry,
  type Discovery,
} from "./catalog.ts";

export { searchCatalog, type SearchMatch } from "./catalog-search.ts";

export {
  ExecuteInput,
  ExecuteResult,
  SearchInput,
  SearchResult,
  invokerFor,
  toCodeMode,
  toCodeModeHandlers,
  type CodeModeCapabilities,
  type CodeModeContracts,
  type CodeModeHandlersLayer,
  type CodeModeOptions,
  type CodeModeProjection,
  type CodeModeToolkit,
  type DeclarationPlacement,
} from "./code-mode.ts";

export { SandboxDiagnostic } from "./diagnostic.ts";

export { ExecuteError, ExecuteFailure, SandboxError } from "./sandbox.errors.ts";

export {
  Sandbox,
  invokeFailure,
  type CheckedRun,
  type Invoke,
  type InvokeOutcome,
  type SandboxLimits,
  type SandboxRun,
} from "./sandbox.ts";

export { sandboxRunner, type SandboxProgram } from "./sandbox-runner.ts";

export { layerSubprocess, type SubprocessOptions } from "./subprocess-sandbox.ts";

export {
  layerWorkerLoader,
  type Dispatch,
  type DynamicWorker,
  type DynamicWorkerEntrypoint,
  type WorkerCode,
  type WorkerLoaderBinding,
  type WorkerLoaderOptions,
} from "./worker-loader-sandbox.ts";
