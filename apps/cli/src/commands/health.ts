import { Api } from "@boberstack/domain/api";
import { Config, Console, Effect } from "effect";
import { Command, Flag } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";

export const HealthCommand = Command.make(
  "health",
  {
    url: Flag.String("url").pipe(
      Flag.withDescription("Base URL of a running API; defaults to the local dev api"),
      Flag.withFallbackConfig(
        Config.Port("DEV_API_PORT").pipe(
          Config.withDefault(1337),
          Config.map((port) => `http://localhost:${String(port)}`),
        ),
      ),
    ),
  },
  Effect.fn("cli.health")(function* ({ url }) {
    const client = yield* HttpApiClient.make(Api, { baseUrl: url });
    const health = yield* client.health.check();

    yield* Console.log(`${url}: ${health.status}`);
  }, Effect.provide(FetchHttpClient.layer)),
).pipe(Command.withDescription("Call GET /api/health through the typed HttpApi client"));
