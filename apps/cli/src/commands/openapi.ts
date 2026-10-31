import { Api } from "@boberstack/domain/api";
import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { OpenApi } from "effect/http-api";

export const OpenApiCommand = Command.make(
  "openapi",
  {},
  Effect.fn("cli.openapi")(function* () {
    yield* Console.log(JSON.stringify(OpenApi.fromApi(Api), null, 2));
  }),
).pipe(Command.withDescription("Print the OpenAPI document derived from the domain contract"));
