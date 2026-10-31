# 07 · Configuration

`Config` is a typed, validated description of what an app needs from its environment. A missing or malformed value fails at startup with a `ConfigError` naming the variable, not halfway through a request.

## Rules

### config.pair: every configurable layer has `layer(options)` and `layerConfig`

- `layer(options)` takes plain values. Tests use it.
- `layerConfig` reads `Config.*` and calls `layer(options)`. Only composition roots use it (`@boberstack/effect/layer-config-only-in-roots`): `apps/api/src/worker.ts`, `apps/api/src/app.layer.ts`, `apps/cli/src/main.ts`, `apps/cli/src/commands/*.ts`.

There is no global config object. A value a module needs from the deployment is a service named after what the module does with it, so the module never sees a variable name.

```ts
// apps/api/src/platform/authentication/auth-settings.ts
export interface AuthSettingsApi {
  readonly secret: Redacted.Redacted;
  readonly baseUrl: URL;
}

export class AuthSettings extends Context.Service<AuthSettings, AuthSettingsApi>()(
  "boberstack/platform/authentication/AuthSettings",
) {
  static readonly layer = (settings: AuthSettingsApi) => Layer.succeed(AuthSettings, settings);

  static readonly layerConfig = Layer.unwrap(
    Effect.gen(function* () {
      const secret = yield* Config.Redacted("BETTER_AUTH_SECRET");
      const baseUrl = yield* Config.URL("BETTER_AUTH_URL");
      return AuthSettings.layer({ secret, baseUrl });
    }),
  );
}
```

```ts
// bad: NaN at runtime, and invisible to tests
const pool = Number(process.env.DATABASE_POOL ?? 10);

// bad: the test must know variable names, and a forgotten key falls back to the real environment
const TestConfig = ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_SECRET: "…" }));
```

### config.schema: every variable is declared in `.env.schema`

[`.env.schema`](../../../../.env.schema) lists every variable `Config` reads, with its type, whether it is `@sensitive` and whether production requires it. It holds no values: defaults stay in code (`Config.withDefault`), local values go in `.env.local` (gitignored). [varlock](https://varlock.dev) loads and validates them: `pnpm env:check` checks the current environment, and the `apps/infra` scripts run `alchemy` under `varlock run`, so `pnpm dev` and `pnpm run deploy` stop on a missing or malformed value before anything starts. Alchemy's own `.env` loading is off (`--env-file /dev/null`), so varlock is the only loader.

`@boberstack/effect/config-in-env-schema` keeps the code and the schema in step: a `Config` name must be a string literal declared in the schema, and `Config.Redacted` must match `@sensitive`. Adding a variable is two lines: the schema entry and the `Config` read.

```env
# @sensitive
GITHUB_CLIENT_SECRET=
```

### config.secrets: secrets are `Config.Redacted`

A redacted value prints as `<redacted>` in logs, spans and error reports. Unwrap it with `Redacted.value` only at the client that needs the raw string. `@boberstack/effect/redacted-secrets` flags a secret-looking key read with `Config.String`.

```ts
const secret = yield * Config.Redacted("BETTER_AUTH_SECRET");
betterAuth({ secret: Redacted.value(secret) });
```

### config.where: where the values come from

| Runtime    | Source                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api Worker | Alchemy's Worker bridge installs a `ConfigProvider` over the Worker's `env`; `alchemy dev` and `alchemy deploy` bind the values `varlock run` put in the process environment |
| `apps/cli` | the default `ConfigProvider` reads `process.env`; `pnpm dev` and docker compose set the local database URL                                                                   |
| `apps/web` | build-time `import.meta.env` values, read once in `runtime.ts` or `vite.config.ts`, never in a feature                                                                       |
| tests      | `layer(options)` with plain values; no `Config` at all ([12](12-test-layers-and-infrastructure.md))                                                                          |

A secret goes into the stack through `.env.local`, `.env.production.local` or the deploy's environment, never into a committed file.

## v4 names

Constructors are PascalCase: `Config.String`, `Config.Int`, `Config.Number`, `Config.Boolean`, `Config.Port`, `Config.Duration`, `Config.Redacted`, `Config.URL`, `Config.Literals`. `Config.schema(codec, name)` reads any Schema. `Config.mapOrFail` is `Config.mapEffect`; `ConfigProvider.fromJson` is `fromUnknown`.

Source: `effect/src/Config.ts`, `ConfigProvider.ts`, `Layer.ts` (`unwrap`), `ai-docs/src/01_effect/03_services/20_layer-unwrap.ts`; `@alchemy.run/cloudflare` `Workers/ConfigProvider.ts`.
