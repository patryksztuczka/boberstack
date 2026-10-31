import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vite-plus/test";

import { requireSessionWith } from "./session.ts";

const renderAt = (path: string, signedIn: boolean) => {
  const router = createMemoryRouter(
    [
      {
        middleware: [requireSessionWith({ isSignedIn: () => Promise.resolve(signedIn) })],
        children: [{ path: "todos", element: <p>private todos</p> }],
      },
      { path: "sign-in", element: <p>sign in page</p> },
    ],
    { initialEntries: [path] },
  );

  render(<RouterProvider router={router} />);

  return router;
};

describe("requireSession", () => {
  it("blocks a protected loader before it can fetch private data", async () => {
    const loadPrivateData = vi.fn<() => null>(() => null);

    const router = createMemoryRouter(
      [
        {
          middleware: [requireSessionWith({ isSignedIn: () => Promise.resolve(false) })],
          children: [{ path: "todos", loader: loadPrivateData, element: <p>private todos</p> }],
        },
        { path: "sign-in", element: <p>sign in page</p> },
      ],
      { initialEntries: ["/todos"] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("sign in page")).toBeInTheDocument();
    expect(loadPrivateData).not.toHaveBeenCalled();
  });

  it("sends a visitor to sign-in and remembers where they were going", async () => {
    const router = renderAt("/todos?x=1", false);

    expect(await screen.findByText("sign in page")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?redirectTo=%2Ftodos%3Fx%3D1");
  });

  it("lets a signed-in user through", async () => {
    renderAt("/todos", true);

    expect(await screen.findByText("private todos")).toBeInTheDocument();
  });
});
