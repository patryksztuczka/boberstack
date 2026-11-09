import { Auth, SocialSignIn } from "@boberstack/auth";
import { TodosService } from "@boberstack/core/todos";
import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Layer, Logger, Option } from "effect";
import { HttpRouter, HttpServer } from "effect/http";

import { HttpLayer } from "./http.layer.ts";

const send = (handler: (request: Request) => Promise<Response>, request: Request) =>
  Effect.promise(() => handler(request));

interface LoggedError {
  readonly message: unknown;
  readonly cause: string;
}

const serve = (sessionOf: typeof Auth.Service.sessionOf, logged: Array<LoggedError>) =>
  Effect.gen(function* () {
    const capture = Logger.make(({ message, cause }) => {
      if (Cause.hasFails(cause) || Cause.hasDies(cause)) {
        logged.push({ message, cause: Cause.pretty(cause) });
      }
    });

    const { handler, dispose } = HttpRouter.toWebHandler(
      HttpLayer.pipe(
        Layer.provide(Layer.mock(TodosService)({ list: () => Effect.succeed([]) })),
        Layer.provide(SocialSignIn.layer({ github: Option.none(), google: Option.none() })),
        Layer.provide(Layer.mock(Auth)({ sessionOf, mcpResourceServer: Option.none() })),
        Layer.provide(HttpServer.layerServices),
        Layer.provide(Logger.layer([capture])),
      ),
      { disableLogger: true },
    );

    yield* Effect.addFinalizer(() => Effect.promise(dispose));

    return handler;
  });

describe("HttpLayer authentication", () => {
  it.effect("answers 503 and logs why when the session cannot be read", () =>
    Effect.gen(function* () {
      const logged: Array<LoggedError> = [];

      const handler = yield* serve(
        () => Effect.die(new Error("Failed to decrypt private key")),
        logged,
      );

      const response = yield* send(
        handler,
        new Request("http://localhost/api/todos", { headers: { cookie: "session=1" } }),
      );

      assert.strictEqual(response.status, 503);
      assert.strictEqual(logged.length, 1);
      assert.include(logged[0]?.cause ?? "", "Failed to decrypt private key");
    }),
  );

  it.effect("logs nothing when there is simply no session", () =>
    Effect.gen(function* () {
      const logged: Array<LoggedError> = [];
      const handler = yield* serve(() => Effect.succeed(null), logged);

      const response = yield* send(handler, new Request("http://localhost/api/todos"));

      assert.strictEqual(response.status, 401);
      assert.deepStrictEqual(logged, []);
    }),
  );
});
