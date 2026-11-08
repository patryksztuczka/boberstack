import { ApiOrigin } from "@boberstack/client-runtime/api-origin";
import { clientLayer } from "@boberstack/client-runtime/atom-runtime";
import { SignInMethodsHttpClientLayer } from "@boberstack/client-runtime/identity";
import { TodosHttpClientLayer } from "@boberstack/client-runtime/todos";
import { RegistryProvider } from "@effect/atom-react";
import { render, screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { Atom } from "effect/reactivity";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vite-plus/test";

import { TodosPage } from "../features/todos/index.ts";
import { SignedInLayout } from "./signed-in-layout.tsx";

const apiAnswering = (status: number, body: string) =>
  Layer.mergeAll(TodosHttpClientLayer, SignInMethodsHttpClientLayer).pipe(
    Layer.provide(ApiOrigin.layer("http://api.test")),
    Layer.provide(
      Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request) =>
          Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              new Response(body, { status, headers: { "content-type": "application/json" } }),
            ),
          ),
        ),
      ),
    ),
  );

const renderTodosAnswering = (status: number, body: string) => {
  const router = createMemoryRouter(
    [
      { element: <SignedInLayout />, children: [{ path: "todos", element: <TodosPage /> }] },
      { path: "sign-in", element: <p>sign in</p> },
    ],
    { initialEntries: ["/todos?x=1"] },
  );

  render(
    <RegistryProvider initialValues={[Atom.initialValue(clientLayer, apiAnswering(status, body))]}>
      <RouterProvider router={router} />
    </RegistryProvider>,
  );

  return router;
};

describe("session expiry", () => {
  it("sends the user to sign in when the API says the session is gone", async () => {
    const router = renderTodosAnswering(401, '{"_tag":"UnauthorizedError"}');

    expect(await screen.findByText("sign in")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?redirectTo=%2Ftodos%3Fx%3D1&expired=1");
  });

  it("leaves other failures to the page", async () => {
    const router = renderTodosAnswering(503, "{}");

    expect(await screen.findByText(/Could not reach the API/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/todos");
  });

  it("shows the todos the API answers with", async () => {
    renderTodosAnswering(
      200,
      JSON.stringify([
        {
          id: "3f0c5c1e-8a4b-4c3e-9a51-6f1f2d1b7c10",
          title: "Write the starter",
          completed: false,
          createdAt: "2026-10-30T09:00:00.000Z",
        },
      ]),
    );

    expect(await screen.findByText("Write the starter")).toBeInTheDocument();
  });
});
