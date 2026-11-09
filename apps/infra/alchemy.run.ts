import * as Docker from "@alchemy.run/docker";
import { postgresState } from "@alchemy.run/sql/PostgresState";
import * as Alchemy from "alchemy";
import { Random, RandomProvider } from "alchemy/Random";
import { Config, Effect, Layer, Option, Redacted } from "effect";

const CONTAINER_PORT = 3000;

const whenSet = <A>(name: string, config: Config.Config<A>) =>
  Effect.map(
    config.pipe(Config.option),
    Option.match({ onNone: () => ({}), onSome: (value) => ({ [name]: value }) }),
  );

const forwardedEnvironment = Effect.map(
  Effect.all([
    whenSet("AUTH_BASE_URL", Config.String("AUTH_BASE_URL")),
    whenSet("AUTH_TRUSTED_ORIGINS", Config.String("AUTH_TRUSTED_ORIGINS")),
    whenSet("MAIL_TRANSPORT", Config.String("MAIL_TRANSPORT")),
    whenSet("MAILPIT_URL", Config.String("MAILPIT_URL")),
    whenSet("MAIL_FROM_EMAIL", Config.String("MAIL_FROM_EMAIL")),
    whenSet("MAIL_FROM_NAME", Config.String("MAIL_FROM_NAME")),
    whenSet("GITHUB_CLIENT_ID", Config.String("GITHUB_CLIENT_ID")),
    whenSet("GITHUB_CLIENT_SECRET", Config.Redacted("GITHUB_CLIENT_SECRET")),
    whenSet("GOOGLE_CLIENT_ID", Config.String("GOOGLE_CLIENT_ID")),
    whenSet("GOOGLE_CLIENT_SECRET", Config.Redacted("GOOGLE_CLIENT_SECRET")),
  ]),
  (entries): Record<string, string | Redacted.Redacted<string>> => Object.assign({}, ...entries),
);

const Target = Effect.gen(function* () {
  const host = yield* Config.String("DEPLOY_DOCKER_HOST").pipe(Config.option);

  return yield* Option.match(host, {
    onNone: () => Effect.succeed({}),
    onSome: (docker) =>
      Effect.map(Docker.Context("Target", { docker: `host=${docker}` }), (context) => ({
        context,
      })),
  });
});

export default Alchemy.Stack(
  "Boberstack",
  {
    providers: Layer.mergeAll(Docker.providers(), RandomProvider()),
    state: postgresState({ url: Config.Redacted("DATABASE_URL") }),
  },
  Effect.gen(function* () {
    const target = yield* Target;
    const port = yield* Config.Port("API_PORT").pipe(Config.withDefault(CONTAINER_PORT));
    const authSecret = yield* Random("AuthSecret");

    const image = yield* Docker.Image("ApiImage", {
      ...target,
      build: { context: "../..", dockerfile: "apps/infra/api.Dockerfile" },
    });

    const api = yield* Docker.Container("Api", {
      ...target,
      image,
      start: true,
      restart: "unless-stopped",
      ports: [{ external: port, internal: CONTAINER_PORT }],
      environment: {
        ...(yield* forwardedEnvironment),
        PORT: String(CONTAINER_PORT),
        DATABASE_URL: yield* Config.Redacted("DATABASE_URL"),
        AUTH_SECRET: authSecret.text,
      },
    });

    return { container: api.name, port };
  }),
);
