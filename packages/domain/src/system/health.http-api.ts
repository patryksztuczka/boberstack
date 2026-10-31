import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";

export const Health = Schema.Struct({
  status: Schema.Literal("ok"),
});

export class HealthHttpApi extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("check", "/api/health", { success: Health }),
) {}
