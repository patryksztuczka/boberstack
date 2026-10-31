import { Api } from "@boberstack/domain/api";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

export const HealthHttpLayer = HttpApiBuilder.group(Api, "health", (handlers) =>
  handlers.handle("check", () => Effect.succeed({ status: "ok" as const })),
);
