import type { OxlintConfig } from "vite-plus/lint";

const skill = ".agents/skills/effect-v4/references";

const antiSlopRules = {
  "anti-slop/no-array-filter-map": "error",
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reduce-accumulator-copy": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  "anti-slop/no-runtime-typeof": "error",
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-readable-spacing": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
  "anti-slop-effect/no-manual-effect-error-tag": "error",
  "anti-slop-effect/no-manual-tag-comparison": "error",
  "anti-slop-effect/no-manual-tagged-construction": "error",
  "anti-slop-effect/no-service-constructor-imports": "error",
  "anti-slop-effect/prefer-effect-match": "error",
} satisfies OxlintConfig["rules"];

const effectRules = {
  "@boberstack/effect/branded-ids": "error",
  "@boberstack/effect/config-in-env-schema": "error",
  "@boberstack/effect/effect-fn-name": "error",
  "@boberstack/effect/layer-config-only-in-roots": [
    "error",
    {
      allow: [
        "apps/api/src/worker.ts",
        "apps/api/src/app.layer.ts",
        "apps/cli/src/main.ts",
        "apps/cli/src/commands/*.ts",
      ],
    },
  ],
  "@boberstack/effect/layer-naming": "error",
  "@boberstack/effect/log-literal-message": "error",
  "@boberstack/effect/module-boundaries": [
    "error",
    {
      sourceRoot: "apps/*/src/modules",
      indexOnly: ["apps/*/src/platform/**"],
      rootFiles: ["apps/*/src/*"],
    },
  ],
  "@boberstack/effect/no-decode-sync": "error",
  "@boberstack/effect/no-domain-adapters": "error",
  "@boberstack/effect/no-domain-sql": "error",
  "@boberstack/effect/no-error-instanceof": "error",
  "@boberstack/effect/no-error-subclass": "error",
  "@boberstack/effect/no-new-promise": "error",
  "@boberstack/effect/no-store-fakes": "error",
  "@boberstack/effect/no-throw-in-effect": "error",
  "@boberstack/effect/no-try-in-tests": "error",
  "@boberstack/effect/no-untyped-failure": "error",
  "@boberstack/effect/redacted-secrets": "error",
  "@boberstack/effect/retry-requires-while": "error",
  "@boberstack/effect/run-only-in-entry-points": [
    "error",
    {
      allow: [
        "apps/api/src/worker.ts",
        "apps/cli/src/main.ts",
        "apps/web/src/runtime.ts",
        "apps/infra/alchemy.run.ts",
        "**/vitest.global-setup.ts",
      ],
    },
  ],
  "@boberstack/effect/service-explicit-shape": "error",
  "@boberstack/effect/service-id-matches-path": [
    "error",
    {
      prefix: "boberstack",
      sourceRoot: "apps/*/src/modules",
      extraRoots: {
        "apps/*/src/platform": "boberstack/platform",
        "packages/domain/src": "boberstack/domain",
      },
      idSource: "class",
    },
  ],
  "@boberstack/effect/tagged-error-naming": ["error", { filePattern: "\\.errors\\.ts$" }],
  "@boberstack/effect/try-requires-catch": "error",
} satisfies OxlintConfig["rules"];

const testHygieneRules = {
  "@boberstack/test-hygiene/no-polling-loop-in-tests": "error",
  "@boberstack/test-hygiene/no-real-time-wait-in-tests": "error",
  "@boberstack/test-hygiene/no-test-timeout-or-unreasoned-skip": "error",
  "vitest/no-disabled-tests": "off",
  "vitest/no-focused-tests": "off",
} satisfies OxlintConfig["rules"];

const lint = {
  options: { typeAware: true, denyWarnings: true, reportUnusedDisableDirectives: "error" },
  plugins: ["typescript", "oxc", "import", "promise", "vitest"],
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
    { name: "anti-slop-effect", specifier: "./tools/oxlint/anti-slop/effect/index.ts" },
    { name: "@boberstack/effect", specifier: "./tools/oxlint/boberstack/effect/index.ts" },
    {
      name: "@boberstack/no-comments",
      specifier: "./tools/oxlint/boberstack/no-comments/index.ts",
    },
    {
      name: "@boberstack/suppressions",
      specifier: "./tools/oxlint/boberstack/suppressions/index.ts",
    },
    {
      name: "@boberstack/test-hygiene",
      specifier: "./tools/oxlint/boberstack/test-hygiene/index.ts",
    },
    { name: "@boberstack/frontend", specifier: "./tools/oxlint/boberstack/frontend/index.ts" },
  ],
  categories: { correctness: "error" },
  env: { builtin: true, es2024: true },
  rules: {
    ...antiSlopRules,
    "@boberstack/no-comments/no-comments": "error",
    "@boberstack/suppressions/require-suppression-reason": "error",
    "no-alert": "error",
    "no-debugger": "error",
    "no-unused-vars": "off",
    "typescript/no-unused-vars": "error",
    "import/no-cycle": "error",
    "oxc/no-accumulating-spread": "error",
    "vitest/no-restricted-vi-methods": [
      "error",
      {
        useFakeTimers: `Use TestClock (see ${skill}/01-default-services.md).`,
        setSystemTime: `Use TestClock (see ${skill}/01-default-services.md).`,
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: testHygieneRules,
    },
    {
      files: ["apps/web/**", "packages/ui/**"],
      plugins: ["react"],
      env: { browser: true },
    },
    {
      files: ["apps/web/src/**"],
      rules: {
        "@boberstack/frontend/feature-boundaries": [
          "error",
          {
            featuresRoot: "apps/web/src/features",
            layers: ["apps/web/src/shared", "apps/web/src/features", "apps/web/src/app"],
            roots: ["apps/web/src/runtime.ts"],
          },
        ],
      },
    },
    {
      files: ["apps/api/**", "apps/cli/**", "apps/infra/**", "packages/domain/**"],
      rules: effectRules,
    },
    {
      files: [
        "apps/api/**",
        "apps/cli/**",
        "apps/infra/**",
        "scripts/**",
        "tools/**",
        "*.config.ts",
      ],
      env: { node: true },
    },
    {
      files: ["tools/oxlint/**"],
      rules: { "anti-slop/no-runtime-typeof": "off" },
    },
  ],
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/**",
    "**/coverage/**",
    "tools/oxlint/anti-slop/**",
    "apps/web/src/paraglide/**",
    ".agents/**",
    ".claude/**",
    ".scratch/**",
  ],
} satisfies OxlintConfig;

export default lint;
