import { UnauthorizedError } from "@boberstack/domain/identity/authentication.errors";
import { McpClientId } from "@boberstack/domain/identity/mcp-client";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { ApiOrigin } from "../api-origin/index.ts";
import { SessionExpiry } from "../session/index.ts";
import {
  McpClientDirectoryUnavailableError,
  McpClientNotFoundError,
} from "./mcp-client-directory.errors.ts";

export class McpClientProfile extends Schema.Class<
  McpClientProfile,
  { readonly brand: unique symbol }
>("McpClientProfile")({
  clientId: McpClientId,
  name: Schema.Option(Schema.String),
}) {
  get displayName(): string {
    return Option.getOrElse(this.name, () => this.clientId);
  }
}

export type McpClientDirectoryError =
  | McpClientNotFoundError
  | McpClientDirectoryUnavailableError
  | UnauthorizedError;

export interface McpClientDirectoryApi {
  readonly profileOf: (
    clientId: McpClientId,
  ) => Effect.Effect<McpClientProfile, McpClientDirectoryError>;
}

export class McpClientDirectory extends Context.Service<
  McpClientDirectory,
  McpClientDirectoryApi
>()("boberstack/client-runtime/identity/McpClientDirectory") {}

const PublicClient = Schema.Struct({
  client_id: McpClientId,
  client_name: Schema.optional(Schema.NullOr(Schema.String)),
});

const unavailable = (error: { readonly message: string }) =>
  new McpClientDirectoryUnavailableError({ reason: error.message });

export const McpClientDirectoryHttpLayer = Layer.effect(
  McpClientDirectory,
  Effect.gen(function* () {
    const { origin } = yield* ApiOrigin;
    const http = yield* HttpClient.HttpClient;
    const { expire } = yield* SessionExpiry;

    const profileOf = Effect.fn("McpClientDirectory.profileOf")(function* (clientId: McpClientId) {
      const response = yield* http
        .execute(
          HttpClientRequest.get(`${origin}/api/auth/oauth2/public-client`).pipe(
            HttpClientRequest.setUrlParam("client_id", clientId),
            HttpClientRequest.acceptJson,
          ),
        )
        .pipe(Effect.mapError(unavailable));

      if (response.status === 401) {
        yield* expire;

        return yield* new UnauthorizedError();
      }

      if (response.status === 404) return yield* new McpClientNotFoundError({ clientId });

      const client = yield* HttpClientResponse.filterStatusOk(response).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(PublicClient)),
        Effect.mapError(unavailable),
      );

      return new McpClientProfile({
        clientId: client.client_id,
        name: Option.fromNullishOr(client.client_name),
      });
    });

    return McpClientDirectory.of({ profileOf });
  }),
);
