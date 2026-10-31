import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vite-plus/test";

import { WelcomePage } from "./welcome-page.tsx";

const renderPage = () =>
  render(
    <MemoryRouter>
      <WelcomePage />
    </MemoryRouter>,
  );

describe("WelcomePage", () => {
  it("links to the todo example and to sign-up", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Open the todo example" })).toHaveAttribute(
      "href",
      "/todos",
    );
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("lets keyboard users poke the beaver", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Poke the beaver" })).toBeInTheDocument();
  });
});
