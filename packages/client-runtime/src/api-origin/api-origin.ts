import { Context, Layer } from "effect";

export interface ApiOriginApi {
  readonly origin: string;
}

export class ApiOrigin extends Context.Service<ApiOrigin, ApiOriginApi>()(
  "boberstack/client-runtime/api-origin/ApiOrigin",
) {
  static readonly layer = (origin: string) => Layer.succeed(this, { origin });
}
