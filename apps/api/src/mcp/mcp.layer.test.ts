import { AccessTokenUserNotFoundError, Auth } from "@boberstack/auth";
import { TodosService } from "@boberstack/core/todos";
import { User, UserId } from "@boberstack/domain/identity/user";
import { Todo, TodoId, TodoTitle } from "@boberstack/domain/todos/todo";
import { TodoNotFoundError } from "@boberstack/domain/todos/todo.errors";
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { HttpRouter } from "effect/http";

import { McpLayer } from "./mcp.layer.ts";

const ORIGIN = "http://localhost:23500";

const RESOURCE = `${ORIGIN}/api/mcp`;

const alice = new User({
  id: UserId.make("user-alice"),
  name: "Alice",
  email: "alice@example.com",
});

const missingId = TodoId.make("3f0c5c1e-8a4b-4c3e-9a51-6f1f2d1b7c10");

const ownedBy = (ownerId: UserId) =>
  new Todo({
    id: TodoId.make("7a1d1f0e-2b8c-4f5e-9d3a-0c6b5e4f3a21"),
    title: TodoTitle.make(`owned by ${ownerId}`),
    completed: false,
    createdAt: DateTime.makeUnsafe(0),
  });

const TodosServiceFake = Layer.mock(TodosService)({
  list: (ownerId) => Effect.succeed([ownedBy(ownerId)]),
  update: (_ownerId, id) => Effect.fail(new TodoNotFoundError({ id })),
});

const AuthWithAccessTokens = Layer.mock(Auth)({
  mcpResourceServer: Option.some({
    resource: RESOURCE,
    accessTokenUserOf: (token: string) =>
      token === "alice-token"
        ? Effect.succeed(alice)
        : Effect.fail(new AccessTokenUserNotFoundError({ userId: UserId.make("user-gone") })),
  }),
});

const AuthWithoutBaseUrl = Layer.mock(Auth)({ mcpResourceServer: Option.none() });

const serve = (auth: Layer.Layer<Auth>) =>
  Effect.gen(function* () {
    const { handler, dispose } = HttpRouter.toWebHandler(
      McpLayer.pipe(Layer.provide(TodosServiceFake), Layer.provide(auth)),
      { disableLogger: true },
    );

    yield* Effect.addFinalizer(() => Effect.promise(dispose));

    return handler;
  });

const PROTOCOL_VERSION = "2026-07-28";

const mcpRequest = (
  method: "tools/list" | "tools/call",
  params: { readonly name?: string; readonly arguments?: { readonly [key: string]: Json } },
  authorization?: string,
) =>
  new Request(RESOURCE, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": PROTOCOL_VERSION,
      "mcp-method": method,
      ...(params.name === undefined ? undefined : { "mcp-name": params.name }),
      ...(authorization === undefined ? undefined : { authorization }),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0.0" },
        },
      },
    }),
  });

type Json =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<Json>
  | { readonly [key: string]: Json };

const listTools = (authorization?: string) => mcpRequest("tools/list", {}, authorization);

const callTool = (name: string, args: { readonly [key: string]: Json }) =>
  mcpRequest("tools/call", { name, arguments: args }, "Bearer alice-token");

const JsonRpcError = Schema.Struct({
  error: Schema.Struct({ code: Schema.Finite, message: Schema.String }),
  id: Schema.Null,
});

const ToolList = Schema.Struct({
  result: Schema.Struct({ tools: Schema.Array(Schema.Struct({ name: Schema.String })) }),
});

const ToolResult = <S extends Schema.Top>(structuredContent: S) =>
  Schema.Struct({
    result: Schema.Struct({
      isError: Schema.optional(Schema.Boolean),
      structuredContent,
      content: Schema.Array(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String })),
    }),
  });

const ToolError = Schema.Struct({
  result: Schema.Struct({
    isError: Schema.Literal(true),
    content: Schema.Array(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String })),
  }),
});

const TodoList = Schema.Struct({ todos: Schema.Array(Todo) });

const lastMessage = (body: string, contentType: string | null) =>
  contentType?.startsWith("text/event-stream") === true
    ? (body
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .at(-1)
        ?.slice("data: ".length) ?? "")
    : body;

const read = <S extends Schema.Top>(schema: S, response: Response) =>
  Effect.promise(() => response.text()).pipe(
    Effect.map((body) => lastMessage(body, response.headers.get("content-type"))),
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(schema))),
  );

const send = (handler: (request: Request) => Promise<Response>, request: Request) =>
  Effect.promise(() => handler(request));

describe("McpLayer with access tokens", () => {
  it.effect("refuses a request without an access token with an RFC 9728 challenge", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithAccessTokens);

      const response = yield* send(handler, listTools());
      const body = yield* read(JsonRpcError, response);

      assert.strictEqual(response.status, 401);
      assert.strictEqual(
        response.headers.get("www-authenticate"),
        `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/api/mcp"`,
      );
      assert.strictEqual(body.error.code, -32000);
    }),
  );

  it.effect("refuses an access token whose User is unknown", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithAccessTokens);

      const response = yield* send(handler, listTools("Bearer stolen-token"));

      assert.strictEqual(response.status, 401);
      assert.include(response.headers.get("www-authenticate") ?? "", "resource_metadata=");
    }),
  );

  it.effect("refuses a scheme other than Bearer", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithAccessTokens);

      const response = yield* send(handler, listTools("DPoP alice-token"));

      assert.strictEqual(response.status, 401);
    }),
  );

  it.effect("lists the Todos tools", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithAccessTokens);

      const { result } = yield* read(
        ToolList,
        yield* send(handler, listTools("Bearer alice-token")),
      );

      assert.deepStrictEqual(
        result.tools.map((tool) => tool.name),
        ["ListTodos", "CreateTodo", "UpdateTodo", "RemoveTodo"],
      );
    }),
  );

  it.effect("runs a tool for the Current User the access token names", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithAccessTokens);

      const { result } = yield* read(
        ToolResult(TodoList),
        yield* send(handler, callTool("ListTodos", {})),
      );

      assert.isFalse(result.isError ?? false);
      assert.deepStrictEqual(
        result.structuredContent.todos.map((todo) => todo.title),
        ["owned by user-alice"],
      );
    }),
  );

  it.effect("returns TodoNotFoundError as a tool error result", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithAccessTokens);

      const { result } = yield* read(
        ToolError,
        yield* send(handler, callTool("UpdateTodo", { id: missingId, patch: { completed: true } })),
      );

      const error = yield* Schema.decodeEffect(Schema.fromJsonString(TodoNotFoundError))(
        result.content.map((part) => part.text).join(""),
      );

      assert.strictEqual(error.id, missingId);
    }),
  );
});

describe("McpLayer without AUTH_BASE_URL", () => {
  it.effect("answers 503", () =>
    Effect.gen(function* () {
      const handler = yield* serve(AuthWithoutBaseUrl);

      const response = yield* send(handler, listTools("Bearer alice-token"));

      assert.strictEqual(response.status, 503);
    }),
  );
});
