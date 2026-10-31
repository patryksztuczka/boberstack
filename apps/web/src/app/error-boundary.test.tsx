import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vite-plus/test";

import { ErrorBoundary } from "./error-boundary.tsx";
import { NotFoundPage, RouteError } from "./route-error.tsx";

const Crash = (): ReactNode => {
  throw new Error("private database credentials");
};

const expectRecovery = () => {
  expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  expect(screen.queryByText(/private database credentials/)).not.toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
};

describe("error recovery", () => {
  it("recovers a render crash outside the router without exposing the exception", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "We sprang a leak." })).toBeInTheDocument();
    expectRecovery();
    report.mockRestore();
  });

  it("replaces the layout when a route loader fails", async () => {
    const router = createMemoryRouter([
      {
        element: (
          <>
            <nav>session navigation</nav>
            <Outlet />
          </>
        ),
        errorElement: <RouteError />,
        hydrateFallbackElement: <p>Loading</p>,
        children: [
          {
            path: "/",
            loader: () => Promise.reject(new Error("private database credentials")),
            element: <p>private page</p>,
          },
        ],
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "We sprang a leak." })).toBeInTheDocument();
    expectRecovery();
  });

  it("shows the not-found screen for a missing URL", () => {
    render(<NotFoundPage />);

    expect(screen.getByRole("heading", { name: "Nothing built here yet." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Reload page" })).not.toBeInTheDocument();
  });
});
